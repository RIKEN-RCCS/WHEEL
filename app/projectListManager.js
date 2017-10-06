"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require('util');
const uuidv1 = require("uuid/v1");
const logger = require("./logger");
const config = require('./config/server');
var projectList = [];
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
var projectListFilename = path.resolve('./app',config.projectList) + '.json';

fs.readFile(projectListFilename, function (err, data) {
    if (err) {
        logger.info(`project list file read failed. (${projectListFilename})`);
        logger.info('using empty list as initial state');
        return;
    }
    var fileData = JSON.parse(data.toString());
    if (!Array.isArray(fileData)) {
        logger.info(`project list file has illegal data structure. (${projectListFilename})`);
        logger.info('using empty list as initial state');
        return;
    }
    projectList = fileData;
});
var writing = false;
var writeProjectListFile = function () {
    if (writing) {
        logger.debug('skip writing projectList at this time');
        return;
    }
    writing = true;
    fs.writeFile(projectListFilename, JSON.stringify(projectList, null, 4), function () {
        writing = false;
    });
};
/**
 * 条件に一致するプロジェクトを返す
 * @param query プロジェクトIDまたはpath
 */
function getProject(query) {
    return projectList.find(function (item) {
        if (item.id == query || item.path == query)
            return true;
    });
}
function getAllProject() {
  return Promise.all(projectList.map(function(v){
    return util.promisify(fs.readFile)(v.path)
            .then(function(projectJson){
              var tmp = JSON.parse(projectJson);
              return Object.assign(tmp,v)
            });
  }));
}
function reorder(newOrder) {
    if (projectList.length != newOrder.length) {
        logger.warn(`illegal reorder array. original length: ${projectList.length} reorder array length: ${newOrder.length}`);
    }
    var tmp = [];
    var index = 0;
    for (let i of newOrder) {
        tmp[index] = projectList[i];
        index++;
    }
    projectList = Array.from(tmp);
    writeProjectListFile();
    return this.getAllProject();
}
function remove(id) {
    var numProjects = projectList.length;
    projectList = projectList.filter((item) => {
        return (item.id != id);
    });
    if (projectList.length != numProjects) {
        writeProjectListFile();
    }
    return this.getAllProject();
}
function rename(oldName, newName) {
    if (newName == oldName)
        return;
    var index = projectList.findIndex((item) => {
        if (item.label == oldName)
            return true;
    });
    projectList[index].label = newName;
    writeProjectListFile();
    return this.getAllProject();
}
/*
 * add new project Json file to project list
 * @param path  project Json file's path (must be absolute path but not checked for now)
 */
function add(path) {
    var exists = projectList.some(function (item) {
        return item.path == path;
    });
    if (exists) return;
    var uuid = uuidv1();
    projectList.push({"path": path, "id": uuid });
    writeProjectListFile();
    return this.getAllProject();
}
exports.getProject = getProject;
exports.getAllProject = getAllProject;
exports.reorder = reorder;
exports.remove = remove;
exports.rename = rename;
exports.add = add;
