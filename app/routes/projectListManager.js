"use strict";
const fs = require("fs");
const path = require("path");
const util = require('util');

const logger = require("../logger");
const {projectList} = require('../db/db');
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

function getAllProject() {
  debugger;
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
  return projectList.remove(id)
    .then(()=>{
      return this.getAllProject();
    });
}
function rename(id, projectJsonFilePath) {
  let tmp = projectList.get(id);
  tmp.path = projectJsonFilePath;
  return projectList.update(tmp)
    .then(()=>{
      return this.getAllProject();
    });
}
/*
 * add new project Json file to project list
 * @param path  project Json file's path (must be absolute path but not checked for now)
 */
function add(path) {
  return projectList.add({"path": path})
    .then(()=>{
      return this.getAllProject();
    });
}
exports.getProject = getProject;
exports.getAllProject = getAllProject;
exports.reorder = reorder;
exports.remove = remove;
exports.rename = rename;
exports.add = add;
