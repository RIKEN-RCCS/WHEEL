"use strict";
const promiseRetry = require("promise-retry");
const fs = require("fs-extra");
const Mode = require("stat-mode");

/**
 * read Json file until get some valid JSON data
 * @param {string} filename - filename to be read
 */
async function readJsonGreedy(filename) {
  return promiseRetry(async(retry)=>{
    const buf = await fs.readFile(filename)
      .catch((e)=>{
        if (e.code === "ENOENT") {
          retry(e);
        }
        throw e;
      });
    const strData = buf.toString("utf8").replace(/^\uFEFF/, "");
    if (strData.length === 0) {
      retry(new Error("read failed"));
    }
    let jsonData;
    try {
      jsonData = JSON.parse(strData);
    } catch (e) {
      if (e instanceof SyntaxError) {
        retry(e);
      }
      throw e;
    }
    //need check by jsonSchema but it may cause performance problem
    return jsonData;
  },
  {
    retries: 10,
    minTimeout: 500,
    factor: 1
  });
}

/**
 * add execute permission to file
 * @param {string} file - filename in absolute path
 */
async function addX(file) {
  const stat = await fs.stat(file);
  const mode = new Mode(stat);
  let u = 4;
  let g = 4;
  let o = 4;

  if (mode.owner.read) {
    u += 1;
  }

  if (mode.owner.write) {
    u += 2;
  }

  if (mode.group.read) {
    g += 1;
  }

  if (mode.group.write) {
    g += 2;
  }

  if (mode.others.read) {
    o += 1;
  }

  if (mode.others.write) {
    o += 2;
  }
  const modeString = u.toString() + g.toString() + o.toString();
  return fs.chmod(file, modeString);
}

/**
 * deliver src to dst
 * @param {string} src - absolute path of src path
 * @param {string} dst - absolute path of dst path
 *
 */
async function deliverFile(src, dst) {
  const stats = await fs.lstat(src);
  const type = stats.isDirectory() ? "dir" : "file";

  try {
    await fs.remove(dst);
    await fs.ensureSymlink(src, dst, type);
    return { type: `link-${type}`, src, dst };
  } catch (e) {
    if (e.code === "EPERM") {
      await fs.copy(src, dst, { overwrite: false });
      return { type: "copy", src, dst };
    }
    return Promise.reject(e);
  }
}


module.exports = {
  readJsonGreedy,
  addX,
  deliverFile
};
