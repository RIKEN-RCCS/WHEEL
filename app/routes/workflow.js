"use strict";
const path = require("path");
const express = require("express");
const fileManager = require("./fileManager");
const workflowEditor = require("./workflowEditor2");
const projectController = require("./projectController");
const { remoteHost, projectJsonFilename, componentJsonFilename, getJupyterToken, getJupyterPort } = require("../db/db");
const { getComponent } = require("./workflowUtil");
const { openProject, setSio, getLogger } = require("./projectResource");

module.exports = function(io) {
  let projectRootDir = null;
  const sio = io.of("/workflow");
  sio.on("connect", (socket)=>{
    if (projectRootDir === null) {
      socket.emit("showMessage", "please reload browser");
      return;
    }
    setSio(projectRootDir, socket);
    socket.on("getHostList", ()=>{
      socket.emit("hostList", remoteHost.getAll());
    });

    //event listeners for project operation
    projectController(socket, projectRootDir);

    //event listeners for workflow editing
    workflowEditor(socket, projectRootDir);

    //event listeners for file operation
    fileManager(socket, projectRootDir);

    //redirect error to logger
    socket.on("error", (err)=>{
      getLogger(projectRootDir).debug("socketIO errror occurred:\n",err);
    });
  });

  //eslint-disable-next-line new-cap
  const router = express.Router();
  router.post("/", async(req, res)=>{
    projectRootDir = req.body.project;
    await openProject(projectRootDir);
    const { ID } = await getComponent(projectRootDir, path.resolve(projectRootDir, componentJsonFilename));
    res.cookie("root", ID);
    res.cookie("rootDir", projectRootDir);
    res.cookie("project", path.resolve(projectRootDir, projectJsonFilename));
    const hostname = req.headers.host.slice(0,req.headers.host.indexOf(':'));
    res.cookie("jupyterURL", `http://${hostname}:${getJupyterPort()}/`); //TODO http must be replaced https if SSL enabled
    res.cookie("jupyterToken", getJupyterToken());
    res.sendFile(path.resolve(__dirname, "../views/workflow.html"));
  });
  return router;
};
