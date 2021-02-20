const destPath = process.env.DEST || 'build';

const config = {
  src: {
    root: 'src',
    templates: 'src/pages',
    pug: 'src/pug',
    sass: 'src/sass',
    js: 'src/js',
    img: 'src/img',
    icons: 'src/icons',
    fonts: 'src/fonts',
  },
  dest: {
    root: destPath,
    html: destPath,
    css: `${destPath}/css`,
    js: `${destPath}/js`,
    img: `${destPath}/img`,
    fonts: `${destPath}/fonts`,
  },
  addAssets: {
    'src/fonts/**/*.{woff,woff2}': '/fonts',
  },
};

module.exports = config;
