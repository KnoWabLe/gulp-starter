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
const svgmin = require('gulp-svgmin');
const prettyHtml = require('gulp-pretty-html');
const csso = require('gulp-csso');
const newer = require('gulp-newer');
const webpack = require('webpack');

const config = require('./config');
const mode = process.env.NODE_ENV || 'development';

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
  Object.keys(config.addAssets).forEach((key) => {
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
      .pipe(svgstore({ inlineSvg: true }))
      .pipe(rename('sprite.svg'))
      .pipe(dest(config.dest.img));
  }

  return cb();
}
exports.generateSvgSprite = generateSvgSprite;

// Compile SASS
function compileSass() {
  return src(`${config.src.sass}/app.{sass,scss}`, { sourcemaps: true })
    .pipe(
      plumber({
        errorHandler: function (err) {
          console.log(err.message);
          this.emit('end');
        },
      })
    )
    .pipe(debug({ title: 'Compiles:' }))
    .pipe(sass())
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
    series(compilePugFast, parallel(compileSass, buildJs), reload)
  );

  // Pug Templates
  watch(
    [`${config.src.pug}/**/*.pug`],
    { delay: 100 },
    series(compilePug, parallel(compileSass, buildJs), reload)
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
  parallel(clearBuildDir),
  parallel(compilePugFast, copyAssets, generateSvgSprite),
  parallel(copyImg),
  parallel(compileSass, buildJs)
);

exports.default = series(
  parallel(clearBuildDir),
  parallel(compilePugFast, copyAssets, generateSvgSprite),
  parallel(copyImg),
  parallel(compileSass, buildJs),
  serve
);
