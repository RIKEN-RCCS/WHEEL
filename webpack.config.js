const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports={
  entry: {
    home: "./app/src/home.js",
    workflow: "./app/src/workflow.js",
    rapid: "./app/src/rapid.js",
    remotehost: "./app/src/remotehost.js"
  },
  devtool: 'inline-source-map',
  output: {
    path: path.resolve(__dirname,  "app/public"),
    filename: "js/[name].js"
  },
  resolve: {
    alias: {
      'jquery-ui': 'jquery-ui/ui/widgets',
      'jquery-ui-css': 'jquery-ui/../../themes/base'
    }
  },
  module:{
    rules: [
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader'
        })
      },
      {
        test: /\.json$/,
        use: [
          'json-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|git)$/,
        use: [
          'file-loader'
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          'file-loader'
        ]
      }
    ]
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      chunks: ['home', 'workflow', 'remotehost']
    }),
    new ExtractTextPlugin('css/libs.css')
  ]
};
