const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const includePath = [
  path.resolve(__dirname, 'app/src'),
  path.resolve(__dirname, 'node_modules')
]

module.exports={
  entry: {
    home:       "./app/src/home.js",
    workflow:   "./app/src/workflow.js",
    rapid:      "./app/src/rapid.js",
    remotehost: "./app/src/remotehost.js",
  },
  output: {
    path: path.resolve(__dirname, 'app/public'),
    filename: "js/[name].js"
  },
  devtool: 'eval-source-map',
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      chunks: ['home', 'workflow', 'remotehost', 'rapid']
    }),
    new ExtractTextPlugin({
      filename: 'css/[name].bundled.css',
      allChunks: true
    })
  ],
  module:{
    rules: [
      {
        test: /\.js$/,
        include: includePath,
      },
      {
        test: /\.css$/,
        include: includePath,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader'
        })
      },
      {
        test: /\.json$/,
        include: includePath,
        use: [
          'json-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        include: includePath,
        use: [
          'file-loader'
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        include: includePath,
        use: [
          'file-loader'
        ]
      }
    ]
  }
};
