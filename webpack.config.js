const webpack = require('webpack');
const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');
const config = require('./config');

const mode = process.env.NODE_ENV || 'development';

module.exports = {
  mode,
  context: path.join(__dirname, config.src.js),
  entry: {
    app: './app.js',
  },
  output: {
    path: path.join(__dirname, config.dest.js),
    filename: '[name].js',
  },
  resolve: {
    alias: {
      Utils: path.resolve(__dirname, 'src/js/utils/'),
    },
  },
  devtool: mode === 'production' ? false : 'eval',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: [path.resolve(__dirname, 'node_modules')],
      },
    ],
  },
  plugins: [new ESLintPlugin()],
};
