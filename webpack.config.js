const webpack = require('webpack');
const path = require('path');
const config = require('./config');
const env = process.env.NODE_ENV;

const isProduction = env === 'production' ? true : false;

module.exports = {
  mode: env || 'development',
  context: path.join(__dirname, config.src.js),
  entry: {
    app: './app.js'
  },
  output: {
    path: path.join(__dirname, config.dest.js),
    filename: '[name].js'
  },
  devtool: isProduction ? 'none' : 'cheap-module-eval-source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader', 'eslint-loader'],
        exclude: [path.resolve(__dirname, 'node_modules')]
      }
    ]
  }
}
