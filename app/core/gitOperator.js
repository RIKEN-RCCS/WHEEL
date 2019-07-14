"use strict";
const path = require("path");
const EventEmitter = require("events");
const { promisify } = require("util");
const fs = require("fs-extra");
const nodegit = require("nodegit");
const glob = require("glob");
const { replacePathsep } = require("./pathUtils");

/**
 * git operation class
 */
class Git extends EventEmitter {
  constructor(rootDir) {
    super();
    this.rootDir = rootDir;
    this.addBuffer = [];
    this.rmBuffer = [];
  }

  registerWriteIndex() {
    this.once("writeIndex", ()=>{
      this._write();
    });
  }

  //never call this function directly!!
  //please use this.emit("writeIndex") instead
  async _write() {
    setImmediate(async()=>{
      try {
        if (this.rmBuffer.length > 0 || this.addBuffer.length > 0) {
          const index = await this.repo.refreshIndex();
          if (this.rmBuffer.length > 0) {
            await index.removeAll(this.rmBuffer, null);
            this.rmBuffer = [];
          }
          if (this.addBuffer.length > 0) {
            try {
              await index.addAll(this.addBuffer, 0, null);
            } catch (err) {
              //just ignore file or parent directory does not exists
              if (!err.message.startsWith("could not find") && !err.message.startsWith("failed to open directory")) {
                return Promise.reject(err);
              }
            }
            this.addBuffer = [];
          }
          await index.write();
        }
      } catch (err) {
        this.emit("error");
      }
      if (this.rmBuffer.length > 0 || this.addBuffer.length > 0) {
        this._write();
      } else {
        this.registerWriteIndex();
        this.emit("done");
      }
    });
  }

  /**
   * open git repository
   */
  async open() {
    const repoPath = path.resolve(this.rootDir, ".git");
    this.repo = await nodegit.Repository.open(repoPath);
    this.registerWriteIndex();
  }

  /**
   * create new repository
   * @param {string} root - new repository's root directory
   * @param {string} user - author's name
   * @param {string} mail - author's mailaddress
   */
  async init(user, mail) {
    const repo = await nodegit.Repository.init(this.rootDir, 0);
    const author = nodegit.Signature.now(user, mail);
    const commiter = await author.dup();
    const files = await promisify(glob)("**", { cwd: this.rootDir });
    await repo.createCommitOnHead(files, author, commiter, "create new project");
  }

  /**
   * perform git add
   * @param {string} absTargetPath - target's absolute path
   */
  async add(absTargetPath, isRemoving = false) {
    const stats = await fs.stat(absTargetPath);
    if (stats.isDirectory()) {
      let files = await promisify(glob)("**", { cwd: absTargetPath });
      files = files.map((e)=>{
        return replacePathsep(path.relative(this.rootDir, path.join(absTargetPath, e)));
      });

      if (isRemoving) {
        this.rmBuffer.push(...files);
      } else {
        this.addBuffer.push(...files);
      }
    } else {
      const filename = replacePathsep(path.relative(this.rootDir, absTargetPath));
      if (isRemoving) {
        this.rmBuffer.push(filename);
      } else {
        this.addBuffer.push(filename);
      }
    }
    this.emit("writeIndex");
    return new Promise((resolve, reject)=>{
      const onStop = ()=>{
        /*eslint-disable no-use-before-define */
        this.removeListener("error", onError);
        this.removeListener("done", onDone);
      };
      const onDone = ()=>{
        onStop();
        resolve();
      };
      const onError = (err)=>{
        onStop();
        reject(err);
      };
      this.once("done", onDone);
      this.once("error", onError);
    });
  }

  /**
   * perform git rm
   * @param {string} absTargetPath - target's absolute path
   */
  async rm(absTargetPath) {
    return this.add(absTargetPath, true);
  }

  /**
   * commit already added changed
   * @param {string} name - name for both author and commiter
   * @param {string} mail - e-mail address for both author and commiter
   */
  async commit(name, mail, message) {
    const author = nodegit.Signature.now(name, mail);
    const commiter = await author.dup();
    const index = await this.repo.refreshIndex();
    const oid = await index.writeTree();
    const headCommit = await this.repo.getHeadCommit();
    return this.repo.createCommit("HEAD", author, commiter, message, oid, [headCommit]);
  }

  /**
   * perform git reset HEAD --hard
   */
  async resetHEAD(filePatterns) {
    const pathSpec = typeof filePatterns === "string" ? [filePatterns] : filePatterns;
    const checkoutOpt = Array.isArray(pathSpec) ? { paths: pathSpec } : null;
    const headCommit = await this.repo.getHeadCommit();
    return nodegit.Reset.reset(this.repo, headCommit, nodegit.Reset.TYPE.HARD, checkoutOpt, "master");
  }

  /**
   * perform git clean -df
   */
  async clean() {
    console.log("not implemented");
  }
}

const repos = new Map();

//return empty git instance if rootDir/.git is not exists
async function getGitOperator(rootDir) {
  if (!repos.has(rootDir)) {
    const repo = new Git(rootDir);
    repos.set(rootDir, repo);
    await repo.open();
  }
  return repos.get(rootDir);
}

//initialize repo
async function gitInit(rootDir, user, mail) {
  const repo = new Git(rootDir);
  await repo.init(user, mail);
  repos.set(rootDir, repo);
  return repo.open();
}

//commit already staged(indexed) files
async function gitCommit(rootDir, name, mail, message = "save project") {
  const git = await getGitOperator(rootDir);
  return git.commit(name, mail, message);
}

/**
 * performe git add
 * @param {string} rootDir  - directory path which has ".git" directory
 * @param {string} filename - filename which should be add to repo.
 * filename should be absolute path or relative path from rootDir.
 */
async function gitAdd(rootDir, filename) {
  const absFilename = path.isAbsolute(filename) ? filename : path.resolve(rootDir, filename);
  const git = await getGitOperator(rootDir);
  return git.add(absFilename);
}

/**
 * performe git rm recursively
 * @param {string} rootDir  - directory path which has ".git" directory
 * @param {string} filename - filename which should be add to repo.
 * filename should be absolute path or relative path from rootDir.
 */
async function gitRm(rootDir, filename) {
  const absFilename = path.isAbsolute(filename) ? filename : path.resolve(rootDir, filename);
  const git = await getGitOperator(rootDir);
  return git.rm(absFilename);
}

/**
 * performe git reset HEAD
 * @param {string} rootDir  - directory path which has ".git" directory
 */
async function gitResetHEAD(rootDir, filePatterns) {
  const git = await getGitOperator(rootDir);
  return git.resetHEAD(filePatterns);
}

module.exports = {
  gitInit,
  gitCommit,
  gitAdd,
  gitRm,
  gitResetHEAD
};
