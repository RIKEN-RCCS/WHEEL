module.exports = {
  lintOnSave: false,
  transpileDependencies: [
    "vuetify",
  ],
  outputDir: "../server/app/public/",
  pages: {
    workflow: {
      entry: "src/workflow.js",
      template: "public/index.html",
      title: "workflow",
      filename: "workflow.html",
    },
  },
}
