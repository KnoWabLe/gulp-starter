const { series, parallel, src, dest, watch, lastRun } = require('gulp');
const fs = require('fs');
const plumber = require('gulp-plumber');
const del = require('del');
const pug = require('gulp-pug');
const rename = require('gulp-rename');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const sortMediaQueries = require('postcss-sort-media-queries');
const autoprefixer = require('autoprefixer');
const inlineSVG = require('postcss-inline-svg');
const cpy = require('cpy');
const debug = require('gulp-debug');
const webpackStream = require('webpack-stream');
const svgstore = require('gulp-svgstore');
const cheerio = require('gulp-cheerio');
const svgmin = require('gulp-svgmin');
const prettyHtml = require('gulp-pretty-html');
const csso = require('gulp-csso');
const newer = require('gulp-newer');
const webpack = require('webpack');

const config = require('./config');
const mode = process.env.NODE_ENV || 'development';

const nth = {};
nth.scssImportsList = [];

// Сообщение для компилируемых файлов
let doNotEditMsg =
  '\n ВНИМАНИЕ! Этот файл генерируется автоматически.\n Любые изменения этого файла будут потеряны при следующей компиляции.\n Любое изменение проекта без возможности компиляции ДОЛЬШЕ И ДОРОЖЕ в 2-5 раз.\n\n';

// Настройки бьютификатора
const prettyOption = {
  indent_size: 2,
  indent_char: ' ',
  unformatted: ['code', 'em', 'strong', 'span', 'i', 'b', 'br', 'script'],
  content_unformatted: [],
};

// Список и настройки плагинов postCSS
const postCssPlugins = [
  autoprefixer(),
  sortMediaQueries({
    sort: 'mobile-first',
    // sort: 'desktop-first',
  }),
  inlineSVG(),
];

function writePugMixinsFile(cb) {
  let allBlocksWithPugFiles = getDirectories('pug');
  let pugMixins = '//-' + doNotEditMsg.replace(/\n /gm, '\n  ');
  allBlocksWithPugFiles.forEach(function (blockName) {
    pugMixins += `include ${config.src.blocks.replace(
      config.src.root + '/',
      '../'
    )}/${blockName}/${blockName}.pug\n`;
  });
  fs.writeFileSync(`${config.src.pug}/mixins.pug`, pugMixins);
  cb();
}
exports.writePugMixinsFile = writePugMixinsFile;

// Pug
function compilePug() {
  const fileList = [`${config.src.templates}/**/*.pug`];
  return src(fileList)
    .pipe(
      plumber({
        errorHandler: function (err) {
          console.log(err.message);
          this.emit('end');
        },
      })
    )
    .pipe(debug({ title: 'Compiles ' }))
    .pipe(pug())
    .pipe(prettyHtml(prettyOption))
    .pipe(dest(config.dest.html));
}
exports.compilePug = compilePug;

function compilePugFast() {
  const fileList = [`${config.src.templates}/**/*.pug`];
  return src(fileList, { since: lastRun(compilePugFast) })
    .pipe(
      plumber({
        errorHandler: function (err) {
          console.log(err.message);
          this.emit('end');
        },
      })
    )
    .pipe(debug({ title: 'Compiles ' }))
    .pipe(pug())
    .pipe(prettyHtml(prettyOption))
    .pipe(dest(config.dest.html));
}
exports.compilePugFast = compilePugFast;

// Copy Assets
function copyAssets(cb) {
  Object.keys(config.addAssets).forEach(key => {
    cpy(key, `${config.dest.root}${config.addAssets[key]}`);
  });

  cb();
}
exports.copyAssets = copyAssets;

// Copy images
function copyImg() {
  return src(`${config.src.img}/**/*.{jpg,jpeg,png,gif,svg}`)
    .pipe(newer(config.dest.img))
    .pipe(dest(config.dest.img));
}
exports.copyImg = copyImg;

// Generate SVG Sprite
function generateSvgSprite(cb) {
  const spriteSvgPath = config.src.icons;

  if (fileExist(spriteSvgPath)) {
    return src(`${config.src.icons}/*.svg`)
      .pipe(
        svgmin(function () {
          return { plugins: [{ cleanupIDs: { minify: true } }] };
        })
      )
      .pipe(
        cheerio({
          run: function ($) {
            $('[fill]').removeAttr('fill');
          },
          parserOptions: { xmlMode: true },
        })
      )
      .pipe(svgstore({ inlineSvg: true }))
      .pipe(rename('sprite.svg'))
      .pipe(dest(config.dest.img));
  }

  return cb();
}
exports.generateSvgSprite = generateSvgSprite;

function writeSassImportsFile(cb) {
  const newScssImportsList = [];

  config.addStyleBefore.forEach(function (src) {
    newScssImportsList.push(src);
  });

  let allBlocksWithScssFiles = getDirectories('scss');

  allBlocksWithScssFiles.forEach(function (blockWithScssFile) {
    let url = `${config.src.blocks}/${blockWithScssFile}/${blockWithScssFile}.scss`;
    if (newScssImportsList.indexOf(url) > -1) return;
    newScssImportsList.push(url);
  });

  let diff = getArraysDiff(newScssImportsList, nth.scssImportsList);
  if (diff.length) {
    let msg = `\n/*!*${doNotEditMsg
      .replace(/\n /gm, '\n * ')
      .replace(/\n\n$/, '\n */\n\n')}`;
    let styleImports = msg;
    newScssImportsList.forEach(function (src) {
      styleImports += `@import "${src}";\n`;
    });
    styleImports += msg;
    fs.writeFileSync(`${config.src.sass}/style.scss`, styleImports);
    console.log('---------- Write new style.scss');
    nth.scssImportsList = newScssImportsList;
  }
  cb();
}
exports.writeSassImportsFile = writeSassImportsFile;

// Compile SASS
function compileSass() {
  const fileList = [`${config.src.sass}/style.scss`];

  return src(fileList, { sourcemaps: true })
    .pipe(
      plumber({
        errorHandler: function (err) {
          console.log(err.message);
          this.emit('end');
        },
      })
    )
    .pipe(debug({ title: 'Compiles:' }))
    .pipe(sass({ includePaths: [__dirname + '/', 'node_modules'] }))
    .pipe(postcss(postCssPlugins))
    .pipe(
      csso({
        restructure: false,
      })
    )
    .pipe(
      dest(config.dest.css, {
        sourcemaps: mode === 'development' ? '.' : false,
      })
    )
    .pipe(browserSync.stream());
}
exports.compileSass = compileSass;

function buildJs() {
  return src('src/js/app.js')
    .pipe(plumber())
    .pipe(
      webpackStream(
        {
          config: require('./webpack.config.js'),
        },
        webpack
      )
    )
    .pipe(dest(config.dest.js));
}
exports.buildJs = buildJs;

function clearBuildDir() {
  return del(`${config.dest.root}/**/*`);
}
exports.clearBuildDir = clearBuildDir;

function reload(done) {
  browserSync.reload();
  done();
}

function serve() {
  browserSync.init({
    server: config.dest.root,
    port: 8080,
    startPath: 'index.html',
    open: false,
    notify: false,
  });

  // Pages: changing, adding
  watch(
    [`${config.src.templates}/**/*.pug`],
    { events: ['change', 'add'], delay: 100 },
    series(
      compilePugFast,
      parallel(writeSassImportsFile),
      parallel(compileSass, buildJs),
      reload
    )
  );

  // Pug Templates
  watch(
    [`${config.src.pug}/**/*.pug`],
    { delay: 100 },
    series(
      compilePug,
      parallel(writeSassImportsFile),
      parallel(compileSass, buildJs),
      reload
    )
  );

  // Разметка Блоков: изменение
  watch(
    [`${config.src.blocks}/**/*.pug`],
    { events: ['change'], delay: 100 },
    series(compilePug, reload)
  );

  // Разметка Блоков: добавление
  watch(
    [`${config.src.blocks}/**/*.pug`],
    { events: ['add'], delay: 100 },
    series(writePugMixinsFile, compilePug, reload)
  );

  // Разметка Блоков: удаление
  watch(
    [`${config.src.blocks}/**/*.pug`],
    { events: ['unlink'], delay: 100 },
    writePugMixinsFile
  );

  // Стили Блоков: изменение
  watch(
    [`${config.src.blocks}/**/*.scss`],
    { events: ['change'], delay: 100 },
    series(compileSass)
  );

  // Стили Блоков: добавление
  watch(
    [`${config.src.blocks}/**/*.scss`],
    { events: ['add'], delay: 100 },
    series(writeSassImportsFile, compileSass)
  );

  // Стилевые глобальные файлы: все события
  watch(
    [`${config.src.sass}/**/*.scss`, `!${config.src.sass}/style.scss`],
    { events: ['all'], delay: 100 },
    series(compileSass)
  );

  watch(
    `${config.src.img}/**/*.{jpg,jpeg,png,gif,svg,webp}`,
    { events: ['all'], delay: 100 },
    series(copyImg, reload)
  );

  watch(
    `${config.src.js}/**/*.js`,
    { events: ['all'], delay: 100 },
    series(buildJs, reload)
  );

  watch(
    `${config.src.sass}/**/*.{sass,scss}`,
    { events: ['all'], delay: 100 },
    series(compileSass)
  );

  watch(
    [`${config.src.icons}/*.svg`],
    { events: ['all'], delay: 100 },
    series(generateSvgSprite, copyImg, reload)
  );
}

exports.build = series(
  parallel(clearBuildDir, writePugMixinsFile),
  parallel(compilePugFast, copyAssets, generateSvgSprite),
  parallel(copyImg, writeSassImportsFile),
  parallel(compileSass, buildJs)
);

exports.default = series(
  parallel(clearBuildDir, writePugMixinsFile),
  parallel(compilePugFast, copyAssets, generateSvgSprite),
  parallel(copyImg, writeSassImportsFile),
  parallel(compileSass, buildJs),
  serve
);

/**
 * Проверка существования файла или папки
 * @param  {string} path      Путь до файла или папки
 * @return {boolean}
 */
function fileExist(filepath) {
  let flag = true;
  try {
    fs.accessSync(filepath, fs.F_OK);
  } catch (e) {
    flag = false;
  }
  return flag;
}

/**
 * Получение всех названий поддиректорий, содержащих файл указанного расширения, совпадающий по имени с поддиректорией
 * @param  {string} ext    Расширение файлов, которое проверяется
 * @return {array}         Массив из имён блоков
 */
function getDirectories(ext) {
  let source = `${config.src.blocks}/`;
  let res = fs
    .readdirSync(source)
    .filter(item => fs.lstatSync(source + item).isDirectory())
    .filter(item => fileExist(source + item + '/' + item + '.' + ext));
  return res;
}

/**
 * Получение разницы между двумя массивами.
 * @param  {array} a1 Первый массив
 * @param  {array} a2 Второй массив
 * @return {array}    Элементы, которые отличаются
 */
function getArraysDiff(a1, a2) {
  return a1
    .filter(i => !a2.includes(i))
    .concat(a2.filter(i => !a1.includes(i)));
}
