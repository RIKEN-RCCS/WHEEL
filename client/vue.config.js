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
    home:{
      entry: "src/home.js",
      template: "public/index.html",
      title: "home",
      filename: "home.html",
    },
    remotehost:{
      entry: "src/remotehost.js",
      template: "public/index.html",
      title: "remotehost",
      filename: "remotehost.html",
    }
  },
};
