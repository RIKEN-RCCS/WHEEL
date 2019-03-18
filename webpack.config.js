const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

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
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      chunks: ['home', 'workflow', 'remotehost', 'rapid'],
      minChunks: function (module, count) {
        // extract all css from node_module
        if (module.resource && module.context
          && (/^.*\.(css|scss)$/).test(module.resource)
          && module.context.indexOf("node_modules") !== -1) {
          return true;
        }
        return count >= 2;
      }
    }),
    new ExtractTextPlugin({
      filename: (getPath) => {
        return getPath('css/[name].css').replace('css/js', 'css');
      },
      allChunks: true
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
      },
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
