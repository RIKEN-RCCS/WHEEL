const path = require('path');
const webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    login: "./app/src/js/login",
    home: "./app/src/js/home",
    admin: "./app/src/js/admin",
    workflow: "./app/src/js/workflow",
    rapid: "./app/src/js/rapid",
    remotehost: "./app/src/js/remotehost",
    viewer: "./app/src/js/viewer",
  },
  stats: "detailed",
  devtool: "eval-source-map",
  output: {
    path: path.resolve(__dirname, 'app/public'),
    filename: "js/[name].js"
  },
  optimization: {
    splitChunks: {
      name: "common",
      chunks: 'initial',
    }
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
      chunkFilename: '[id].css',
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.json$/,
        loader:  "json-loader",
        type: "javascript/auto"
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'image/',
              publicPath: (path) => {
                return '../' + path;
              }
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          'url-loader'
        ]
      }
    ]
  }
};
