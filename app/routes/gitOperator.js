"use strict";
const path = require("path");
const EventEmitter = require("events");
const { promisify } = require("util");
const fs = require("fs-extra");
const klaw = require("klaw");
const nodegit = require("nodegit");
const glob = require("glob");
const { replacePathsep } = require("./utility");

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
  //please use emit("wirteIndex") instead
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
    const repo = await nodegit.Repository.init(path.join(this.rootDir, ".git"), 0);
    const author = nodegit.Signature.now(user, mail);
    const commiter = await author.dup();
    const files = await promisify(glob)("**", { cwd: this.rootDir });
    await repo.createCommitOnHead(files, author, commiter, "create new project");
  }

  /**
   * perform git add
   * @param {string} absFilePath - target filepath
   */
  async add(absFilename) {
    const stats = await fs.stat(absFilename);

    if (stats.isDirectory()) {
      const p = [];
      klaw(absFilename)
        .on("data", (item)=>{
          if (item.stats.isFile()) {
            const filename = replacePathsep(path.relative(this.rootDir, item.path));
            p.push(this.index.addByPath(filename));
          }
        })
        .on("error", (err)=>{
          throw new Error("fatal error occurred during recursive git add", err);
        });
      await Promise.all(p);
    } else {
      const filename = replacePathsep(path.relative(this.rootDir, absFilename));
      await this.index.addByPath(filename);
    }
    this.emit("writeIndex");
  }

  /**
   * perform git rm
   * @param {string} absFilePath - target filepath
   */
  async rm(absFilename) {
    const stats = await fs.stat(absFilename);

    if (stats.isDirectory()) {
      const p = [];
      klaw(absFilename)
        .on("data", (item)=>{
          if (item.stats.isFile()) {
            const filename = replacePathsep(path.relative(this.rootDir, item.path));
            p.push(this.index.removeByPath(filename));
          }
        })
        .on("error", (err)=>{
          throw new Error("fatal error occurred during recursive git add", err);
        });
      await Promise.all(p);
    } else {
      const filename = replacePathsep(path.relative(this.rootDir, absFilename));
      await this.index.removeByPath(filename);
    }
    this.emit("writeIndex");
  }

  /**
   * commit already added changed
   * @param {string} name - name for both author and commiter
   * @param {string} mail - e-mail address for both author and commiter
   */
  async commit(name, mail) {
    const author = nodegit.Signature.now(name, mail);
    const commiter = await author.dup();
    const oid = await this.index.writeTree();
    const headCommit = await this.repo.getHeadCommit();
    return this.repo.createCommit("HEAD", author, commiter, "save project", oid, [headCommit]);
  }

  /**
   * perform git reset HEAD --hard
   */
  async resetHEAD() {
    const headCommit = await this.repo.getHeadCommit();
    return nodegit.Reset.reset(this.repo, headCommit, nodegit.Reset.TYPE.HARD, null, "master");
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
async function gitCommit(rootDir, name, mail) {
  const git = await getGitOperator(rootDir);
  return git.commit(name, mail);
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


module.exports.gitInit = gitInit;
module.exports.gitCommit = gitCommit;
module.exports.gitAdd = gitAdd;
module.exports.gitRm = gitRm;
module.exports.getGitOperator = getGitOperator;
