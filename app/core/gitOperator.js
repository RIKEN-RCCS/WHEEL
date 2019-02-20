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
    this.registerWriteIndex();
  }

  registerWriteIndex() {
    this.once("writeIndex", ()=>{
      this._write();
    });
  }

  //never call this function directly!!
  //please use this.emit("wirteIndex") instead
  async _write() {
    setImmediate(async()=>{
      await this.index.write();
      this.registerWriteIndex();
    });
  }

  /**
   * open git repository and index
   */
  async open() {
    const repoPath = path.resolve(this.rootDir, ".git");
    this.repo = await nodegit.Repository.open(repoPath);
    this.index = await this.repo.refreshIndex();
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
   * @param {string} absFilePath - target filepath
   */
  async add(absFilename, isRemoving = false) {
    const stats = await fs.stat(absFilename);
    try {
      if (stats.isDirectory()) {
        let files = await promisify(glob)("**", { cwd: absFilename });
        files = files.map((e)=>{
          return replacePathsep(path.relative(this.rootDir, e));
        });

        if (isRemoving) {
          await this.index.removeAll(files, null);
        } else {
          await this.index.addAll(files, 0, null);
        }
      } else {
        const filename = replacePathsep(path.relative(this.rootDir, absFilename));
        if (isRemoving) {
          await this.index.removeByPath(filename);
        } else {
          await this.index.addByPath(filename);
        }
      }
      this.emit("wirteIndex");
    } catch (e) {
      e.isRemoving = isRemoving;
      e.argFilename = absFilename;
      throw e;
    }
  }

  /**
   * perform git rm
   * @param {string} absFilePath - target filepath
   */
  async rm(absFilename) {
    return this.add(absFilename, true);
  }

  /**
   * commit already added changed
   * @param {string} name - name for both author and commiter
   * @param {string} mail - e-mail address for both author and commiter
   */
  async commit(name, mail, message) {
    const author = nodegit.Signature.now(name, mail);
    const commiter = await author.dup();
    const oid = await this.index.writeTree();
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

//TODO 同時Openの最大値を決めて、それを越えたら古い順にcloseする (indexの取扱がどうなるか要確認)
//return empty git instance if rootDir/.git is not exists
async function getGitOperator(rootDir) {
  if (!repos.has(rootDir)) {
    const repo = new Git(rootDir);
    repos.set(rootDir, repo);
    await repo.open();
  }
  return repos.get(rootDir);
}

//initialize repo and commit all files under the root directory
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
