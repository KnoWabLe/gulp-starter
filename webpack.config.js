const webpack = require('webpack');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const config = require('./config');

function createConfig(env) {
  if (env === undefined) {
    env = process.env.NODE_ENV;
  }

  const isProduction = env === 'production';

  const webpackConfig = {
    mode: isProduction ? 'production' : 'development',
    context: path.join(__dirname, config.src.js),
    entry: {
      app: './app.js'
    },
    output: {
      path: path.join(__dirname, config.dest.js),
      filename: '[name].js',
      publicPath: 'js/'
    },
    devtool: isProduction ? 'none' : '#cheap-module-eval-source-map',
    plugins: [
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery',
        noUiSlider: 'nouislider'
      }),
      new webpack.NoEmitOnErrorsPlugin()
    ],
    resolve: {
      extensions: ['.js'],
      alias: {
        TweenLite: path.resolve(
          'node_modules',
          'gsap/src/uncompressed/TweenLite.js'
        ),
        TweenMax: path.resolve(
          'node_modules',
          'gsap/src/uncompressed/TweenMax.js'
        ),
        TimelineLite: path.resolve(
          'node_modules',
          'gsap/src/uncompressed/TimelineLite.js'
        ),
        TimelineMax: path.resolve(
          'node_modules',
          'gsap/src/uncompressed/TimelineMax.js'
        ),
        ScrollMagic: path.resolve(
          'node_modules',
          'scrollmagic/scrollmagic/uncompressed/ScrollMagic.js'
        ),
        'animation.gsap': path.resolve(
          'node_modules',
          'scrollmagic/scrollmagic/uncompressed/plugins/animation.gsap.js'
        ),
        'debug.addIndicators': path.resolve(
          'node_modules',
          'scrollmagic/scrollmagic/uncompressed/plugins/debug.addIndicators.js'
        )
      }
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          test: /\.js(\?.*)?$/i,
          cache: true,
          parallel: true,
          sourceMap: false
        })
      ]
    },
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.js$/,
          exclude: [path.resolve(__dirname, 'node_modules')]
        },
        {
          test: /\.js$/,
          use: ['babel-loader', 'eslint-loader'],
          exclude: [path.resolve(__dirname, 'node_modules')]
        }
      ]
    }
  };

  if (isProduction) {
    webpackConfig.plugins.push(
      new webpack.LoaderOptionsPlugin({
        minimize: true
      })
    );
  }

  return webpackConfig;
}

module.exports = createConfig();
module.exports.createConfig = createConfig;
