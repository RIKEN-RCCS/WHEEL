const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const includePath = [
  path.resolve(__dirname, 'app/src'),
  path.resolve(__dirname, 'node_modules', 'jquery'),
  path.resolve(__dirname, 'node_modules', 'jquery-ui'),
  path.resolve(__dirname, 'node_modules', 'jquery-contextmenu'),
  path.resolve(__dirname, 'node_modules', 'js-cookie'),
  path.resolve(__dirname, 'node_modules', 'svgjs'),
  path.resolve(__dirname, 'node_modules', 'svg.draggable.js'),
  path.resolve(__dirname, 'node_modules', 'split.js'),
  path.resolve(__dirname, 'node_modules', 'jstree')
]

module.exports={
  entry: {
    home:       "./app/src/js/home",
    workflow:   "./app/src/js/workflow",
    rapid:      "./app/src/js/rapid",
    remotehost: "./app/src/js/remotehost",
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
      minChunks: function(module, count){
        // extract all css from node_module
        if(module.resource && module.context
          && (/^.*\.(css|scss)$/).test(module.resource)
          && module.context.indexOf("node_modules") !== -1){
           return true;
         }
        return count >=2;
      }
    }),
    new ExtractTextPlugin({
      filename: (getPath)=>{
        return getPath('css/[name].css').replace('css/js', 'css');
      },
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
