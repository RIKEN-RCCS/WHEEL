"use strict";
const path = require("path");
const express = require("express");
const fileManager = require("./fileManager");
const rapid2 = require("./rapid2");
const projectController = require("./projectController");
const { remoteHost, projectJsonFilename, componentJsonFilename, getJupyterToken, getJupyterPort } = require("../db/db");
const { getComponent } = require("../core/workflowUtil");
const { openProject, setSio, getLogger } = require("../core/projectResource");
const { getProjectState } = require("../core/projectFilesOperator");

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

    //event listeners for file operation
    fileManager(socket, projectRootDir);

    //event listeners for file editor
    rapid2(socket, projectRootDir);

    //redirect error to logger
    socket.on("error", (err)=>{
      getLogger(projectRootDir).debug("socketIO errror occurred:\n", err);
    });
    //kill itself 10 minuets later after when the last client disconnected
    socket.on("disconnect", ()=>{
      if (io.engine.clientsCount === 0) {
        const delay = 1000 * 60 * 10;
        getLogger(projectRootDir).debug(`the last client disconnected wheel will be shutdown after ${delay / 1000} sec`);
        const timeout = setTimeout(async()=>{
          const projectStatus = await getProjectState(projectRootDir);
          if (io.engine.clientsCount > 0) {
            getLogger(projectRootDir).debug(`shutdown canceled because we have ${io.engine.clientsCount} client now`);
            clearTimeout(timeout);
          } else if (["running", "prepareing"].includes(projectStatus)) {
            getLogger(projectRootDir).debug(`shutdown canceled because project status is ${projectStatus}`);
            clearTimeout(timeout);
          } else {
            getLogger(projectRootDir).info("this process will be shutdown");
            process.exit(0); //eslint-disable-line no-process-exit
          }
        }, delay);
      }
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
    const hostname = req.headers.host.slice(0, req.headers.host.indexOf(":"));
    res.cookie("jupyterURL", `http://${hostname}:${getJupyterPort()}/`); //TODO http must be replaced https if SSL enabled
    res.cookie("jupyterToken", getJupyterToken());
    res.sendFile(path.resolve(__dirname, "../views/workflow.html"));
  });
  return router;
};
