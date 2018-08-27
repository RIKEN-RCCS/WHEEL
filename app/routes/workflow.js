const path = require("path");
const express = require('express');

const fileManager = require('./fileManager');
const workflowEditor = require("./workflowEditor2");
const projectController = require("./projectController");
const {remoteHost, projectJsonFilename, componentJsonFilename} = require('../db/db');
const {getComponent} = require('./workflowUtil');
const {openProject} = require("./projectResource");

module.exports = function(io){
  let projectRootDir="project not loaded";
  const sio = io.of('/workflow');

  sio.on('connect', function (socket) {
    socket.on('getHostList', ()=>{
      socket.emit('hostList', remoteHost.getAll());
    });

    //event listeners for project operation
    projectController(socket, projectRootDir);

    //event listeners for workflow editing
    workflowEditor(socket, projectRootDir);

    //event listeners for file operation
    fileManager(socket, projectRootDir);
  });

  const router = express.Router();
  router.post('/', async (req, res)=>{
    const projectRootDir =req.body.project;
    await openProject(projectRootDir);
    const {ID} = await getComponent(projectRootDir, path.resolve(projectRootDir, componentJsonFilename));
    res.cookie('root', ID);
    res.cookie('rootDir', projectRootDir);
    res.cookie('project', path.resolve(projectRootDir, projectJsonFilename));
    res.sendFile(path.resolve(__dirname, '../views/workflow.html'));
  });
  return router;
}
