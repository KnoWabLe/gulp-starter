const util = require('gulp-util');
const notify = require('gulp-notify');

const production = util.env.production || util.env.prod || false;
const destPath = util.env.dest || 'build';

const config = {
  env: 'development',
  production: production,

  src: {
    root: 'src',
    templates: 'src/pages',
    templatesData: 'src/templates/data',
    pagelist: 'src/index.yaml',
    sass: 'src/sass',
    js: 'src/js',
    img: 'src/img',
    svg: 'src/img/svg',
    icons: 'src/icons',
    iconsSvg: 'src/icons',
    fonts: 'src/fonts',
    lib: 'src/lib',
    data: 'src/data'
  },
  dest: {
    root: destPath,
    html: destPath,
    css: `${destPath}/css`,
    js: `${destPath}/js`,
    img: `${destPath}/img`,
    fonts: `${destPath}/fonts`,
    lib: `${destPath}/lib`,
    data: `${destPath}/data`
  },
  addAssets: {
    'src/fonts/*.{woff,woff2}': '/fonts'
  },

  setEnv: function(env) {
    if (typeof env !== 'string') return;
    this.env = env;
    this.production = env === 'production';
    process.env.NODE_ENV = env;
  },

  logEnv: function() {
    util.log(
      'Environment:',
      util.colors.white.bgRed(' ' + process.env.NODE_ENV + ' ')
    );
  },

  errorHandler: function() {
    const args = Array.prototype.slice.call(arguments);
    notify
      .onError({
        title: 'Compile Error',
        message: '<%= error.message %>',
        sound: 'Submarine'
      })
      .apply(this, args);
    this.emit('end');
  }
};

config.setEnv(production ? 'production' : 'development');

module.exports = config;
