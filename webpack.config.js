const path = require('path');

module.exports={
  entry: {
    home: "./app/src/home.js",
    workflow: "./app/src/workflow.js"
  },
  devtool: 'inline-source-map',
  output: {
    path: path.resolve(__dirname,  "app/public/js"),
    filename: "[name].js"
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
        use: [
          'style-loader',
          'css-loader'
        ]
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
  }
};
