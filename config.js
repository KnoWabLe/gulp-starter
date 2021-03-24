const destPath = process.env.DEST || 'build';

const config = {
  src: {
    root: 'src',
    blocks: 'src/blocks',
    templates: 'src/pages',
    pug: 'src/pug',
    sass: 'src/scss',
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
  addStyleBefore: [
    'src/scss/app.scss',
    // 'somePackage/dist/somePackage.css', // для 'node_modules/somePackage/dist/somePackage.css',
  ],
};

module.exports = config;
