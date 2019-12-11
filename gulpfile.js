const { series, parallel, src, dest, watch, lastRun } = require('gulp');
const fs = require('fs');
const plumber = require('gulp-plumber');
const del = require('del');
const pug = require('gulp-pug');
const rename = require('gulp-rename');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const mqpacker = require('css-mqpacker');
const inlineSVG = require('postcss-inline-svg');
const cpy = require('cpy');
const csso = require('gulp-csso');
const debug = require('gulp-debug');
const webpackStream = require('webpack-stream');
const svgstore = require('gulp-svgstore');
const svgmin = require('gulp-svgmin');
const prettyHtml = require('gulp-pretty-html');

const webpack = require('webpack');

const gutil = require('gulp-util');
const notify = require('gulp-notify');

const webpackConfig = require('./webpack.config').createConfig;
const config = require('./config');

// Настройки бьютификатора
const prettyOption = {
  indent_size: 2,
  indent_char: ' ',
  unformatted: ['code', 'em', 'strong', 'span', 'i', 'b', 'br', 'script'],
  content_unformatted: []
};

// Список и настройки плагинов postCSS
const postCssPlugins = [
  autoprefixer({
    cascade: false
  }),
  mqpacker({
    sort: true
  }),
  inlineSVG()
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
  return src(`${config.src.templates}/**/*.pug`, {
    since: lastRun(compilePug)
  })
    .pipe(
      plumber({
        errorHandler: function(err) {
          console.log(err.message);
          this.emit('end');
        }
      })
    )
    .pipe(debug({ title: 'Compiles ' }))
    .pipe(pug())
    .pipe(prettyHtml(prettyOption))
    .pipe(dest(config.dest.html));
}
exports.compilePug = compilePug;

// Copy Assets
function copyAssets(cb) {
  Object.keys(config.addAssets).forEach(key => {
    cpy(key, `${config.dest.root}${config.addAssets[key]}`);
  });

  cb();
}
exports.copyAssets = copyAssets;

// Copy images
function copyImg(cb) {
  const copiedImages = [];

  if (copiedImages.length) {
    (async () => {
      await cpy(copiedImages, config.desc.img);
      cb();
    })();
  } else {
    cb();
  }
}
exports.copyImg = copyImg;

// Generate SVG Sprite
function generateSvgSprite(cb) {
  const spriteSvgPath = config.src.icons;

  if (fileExist(spriteSvgPath)) {
    return src(`${config.src.icons}/*.svg`)
      .pipe(
        svgmin(function() {
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
  return src(`${config.src.sass}/*.{sass,scss}`, { sourcemaps: true })
    .pipe(
      sass({
        outputStyle: config.production ? 'compact' : 'expanded', // nested, expanded, compact, compressed
        precision: 5
      })
    )
    .on('error', config.errorHandler)
    .pipe(postcss(postCssPlugins))
    .pipe(
      csso({
        restructure: false
      })
    )
    .pipe(dest(config.dest.css, { sourcemaps: '.' }))
    .pipe(browserSync.stream());
}
exports.compileSass = compileSass;

// Webpack log handler
function handler(err, stats, cb) {
  const { errors } = stats.compilation;

  if (err) throw new gutil.PluginError('webpack', err);

  if (errors.length > 0) {
    notify
      .onError({
        title: 'Webpack Error',
        message: '<%= error.message %>',
        sound: 'Submarine'
      })
      .call(null, errors[0]);
  }

  gutil.log(
    '[webpack]',
    stats.toString({
      colors: true,
      chunks: false
    })
  );

  browserSync.reload();
  if (typeof cb === 'function') cb();
}

function buildJs() {
  return src('src/js/app.js')
    .pipe(
      webpackStream(webpackConfig(config.env), webpack, function(err, stats) {
        handler(err, stats);
      })
    )
    .pipe(dest(config.dest.js));
}
exports.buildJs = buildJs;

function clearBuildDir() {
  return del(`${config.dest}/**/*`);
}
exports.clearBuildDir = clearBuildDir;

function reload(done) {
  browserSync.reload();
  done();
}

function serve() {
  browserSync.init({
    server: {
      baseDir: !config.production
        ? [config.dest.root, config.src.root]
        : config.dest.root,
      directory: false,
      serveStaticOptions: {
        extensions: ['html']
      }
    },
    files: [
      `${config.dest.html}/*.html`,
      `${config.dest.css}/*.css`,
      `${config.dest.img}/**/`
    ],
    port: 8080,
    open: false,
    notify: false
  });

  watch(
    `${config.src.templates}/**/*.pug`,
    { events: ['change', 'add'], delay: 100 },
    series(compilePug, reload)
  );

  watch(
    `${config.src.img}/*`,
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
    series(compileSass, reload)
  );

  watch(
    [`${config.src.icons}/*.svg`],
    { events: ['all'], delay: 100 },
    series(generateSvgSprite, copyImg, reload)
  );
}

exports.build = series(
  parallel(clearBuildDir),
  parallel(compilePug, copyAssets, generateSvgSprite),
  parallel(copyImg),
  parallel(compileSass, buildJs)
);

exports.default = series(
  parallel(clearBuildDir),
  parallel(compilePug, copyAssets, generateSvgSprite),
  parallel(copyImg),
  parallel(compileSass, buildJs),
  serve
);
