const path = require('path');

module.exports={
  entry: {
    home: "./app/src/js/home.js",
    workflow: "./app/src/js/workflow.js"
  },
  output: {
    path: path.resolve(__dirname,  "app/public/js"),
    filename: "[name].js"
  }
};
