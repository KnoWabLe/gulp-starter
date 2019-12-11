const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const path = require('path');
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
      // vendor: ['jquery'],
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
      new webpack.NoEmitOnErrorsPlugin(),
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        analyzerPort: 4000,
        openAnalyzer: false
      })
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
      minimize: isProduction
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
