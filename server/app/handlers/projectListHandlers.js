/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
"use strict";
const fs = require("fs-extra");
const { projectList } = require("../db/db.js");

const removeProjectsFromList = async(ids, cb)=>{
  try {
    await projectList.removeMany(ids);
  } catch (e) {
    cb(e);
    return;
  }
  cb(true);
};

const removeProjects = async(ids, cb)=>{
  try {
    await Promise.all(
      ids.map((id)=>{
        const target = projectList.get(id);
        return fs.remove(target.path);
      })
    );
    await projectList.removeMany(ids);
  } catch (e) {
    cb(e);
    return;
  }
  cb(true);
};

module.exports = {
  onRemoveProjectsFromList: removeProjectsFromList,
  onRemoveProjects: removeProjects
};
