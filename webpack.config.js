const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: {
    home: "./app/src/js/home",
    workflow: "./app/src/js/workflow",
    remotehost: "./app/src/js/remotehost",
    viewer: "./app/src/js/viewer"
  },
  stats: "detailed",
  devtool: "eval-source-map",
  output: {
    path: path.resolve(__dirname, "app/public"),
    filename: "js/[name].js"
  },
  optimization: {
    splitChunks: {
      name: "common",
      chunks: "initial"
    },
    minimizer: [new TerserPlugin({}), new OptimizeCSSAssetsPlugin({})]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "css/[name].css"
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"]
      },
      {
        test: /\.json$/,
        loader: "json-loader",
        type: "javascript/auto"
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "image/",
              publicPath: (path)=>{
                return `../${path}`;
              }
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          "url-loader"
        ]
      }
    ]
  }
};
