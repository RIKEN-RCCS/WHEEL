"use strict";
const fs = require("fs");
const path = require("path");
const util = require('util');

const logger = require("../logger");
const config = require('../config/server');
const JsonArrayManager = require("./jsonArrayManager");
/*
 *  projectList example
 *
 * projectList=[
 *  'path' : '/home/foo/bar.proj.json',
 *  'id'   : 'xxxxxxxx-xxxxxxxxx-xxxxxxxxxxxxxxxx'
 *  },
 * {
 *  'path' : '/home/bar/baz.proj.json',
 *  'id'   : 'xxxxxxxx-xxxxxxxxx-xxxxxxxxxxxxxxxx'
 * }]
 */
const projectListFilename = path.resolve('./app',config.projectList) + '.json';
let projectList = new JsonArrayManager(projectListFilename);

function getAllProject() {
  return Promise.all(projectList.getAll().map(function(v){
    return util.promisify(fs.readFile)(v.path)
            .then(function(projectJson){
              let tmp = JSON.parse(projectJson);
              return Object.assign(tmp,v)
            });
  }));
}
function reorder(newOrder) {
  return projectList.reorder(newOrder)
  .then(()=>{
    return this.getAllProject();
  });
}
function getProject(id) {
    return projectList.get(id)
}
function remove(id) {
  projectList.remove(id);
  return this.getAllProject();
}
function rename(id, projectJsonFilePath) {
  let tmp = projectList.get(id);
  tmp.path = projectJsonFilePath;
  projectList.update(tmp);
  return this.getAllProject();
}
/*
 * add new project Json file to project list
 * @param path  project Json file's path (must be absolute path but not checked for now)
 */
function add(path) {
  projectList.add({"path": path});
  return this.getAllProject();
}
exports.getProject = getProject;
exports.getAllProject = getAllProject;
exports.reorder = reorder;
exports.remove = remove;
exports.rename = rename;
exports.add = add;
