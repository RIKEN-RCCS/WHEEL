const path = require("path");
const EventEmitter = require('events');
const fs = require('fs-extra');
const klaw = require('klaw');
const nodegit = require("nodegit");
const {replacePathsep} = require('./utility');

/**
 * git operation class
 */
class git extends EventEmitter{
  constructor(rootDir){
    super();
    this.rootDir = rootDir;
    this.registerWriteIndex();
  }

  registerWriteIndex(){
    this.once('writeIndex', ()=>{
      this._write();
    });
  }
  async _write(){
    setImmediate(async ()=>{
      await this.index.write();
      this.registerWriteIndex();
    });
  }

  /**
   * create new repository
   * this routine is not used for now
   * @param {string} root - new repository's root directory
   * @param {string} user - author's name
   * @param {string} mail - author's mailaddress
   */
  async init(root, user, mail){
  //TODO  'wheel', "wheel@example.com"
  const repo = await nodegit.Repository.init(root, 0);
  const author = nodegit.Signature.now(user, mail); //TODO replace user info
  const commiter= await author.dup();
  await repo.createCommitOnHead([projectJsonFilename, rootWorkflowFilename], author, commiter, "create new project");
  }

  /**
   * open git repository and index
   */
  async open(){
    const repoPath = path.resolve(this.rootDir, '.git');
    this.repo = await nodegit.Repository.open(repoPath);
    this.index = await this.repo.refreshIndex();
  }

  /**
   * perform git add
   * @param {string} absFilePath - target filepath
   */
  async add(absFilename){
    const stats = await fs.stat(absFilename);
    if(stats.isDirectory()){
      const p=[];
      klaw(absFilename)
        .on('data', (item, fileStats)=>{
          if(fileStats.isFile()){
            const filename = replacePathsep(path.relative(this.rootDir, item));
            p.push(this.index.addByPath(filename));
          }
        })
        .on('error', (err, item)=>{
          throw new Error('fatal error occurred during recursive git add',err);
        });
      await Promise.all(p);
    }else{
      const filename = replacePathsep(path.relative(this.rootDir, absFilename));
      await this.index.addByPath(filename);
    }
    this.emit('writeIndex');
  }
  /**
   * perform git rm
   * @param {string} absFilePath - target filepath
   */
  async rm(absFilename){
    const stats = await fs.stat(absFilename);
    if(stats.isDirectory()){
      const p=[];
      klaw(absFilename)
        .on('data', (item, fileStats)=>{
          if(fileStats.isFile()){
            const filename = replacePathsep(path.relative(this.rootDir, item));
            p.push(this.index.removeByPath(filename));
          }
        })
        .on('error', (err, item)=>{
          throw new Error('fatal error occurred during recursive git add',err);
        });
      await Promise.all(p);
    }else{
      const filename = replacePathsep(path.relative(this.rootDir, absFilename));
      await this.index.removeByPath(filename);
    }
    this.emit('writeIndex');
  }

  /**
   * commit already added changed
   * @param {string} name - name for both author and commiter
   * @param {string} mail - e-mail address for both author and commiter
   */
  async commit(name, mail){
    const author = nodegit.Signature.now(name, mail);
    const commiter= await author.dup();

    const oid = await this.index.writeTree();
    const headCommit = await this.repo.getHeadCommit();
    return this.repo.createCommit("HEAD", author, commiter, "save project", oid, [headCommit]);
  }

  /**
   * perform git reset HEAD --hard
   */
  async resetHEAD(){
    const headCommit = await this.repo.getHeadCommit();
    return nodegit.Reset.reset(this.repo, headCommit, nodegit.Reset.TYPE.HARD, null, "master");
  }
}

const repos = new Map();
async function getGitOperator(rootDir){
  if(! repos.has(rootDir)){
    const repo = new git(rootDir);
    repos.set(rootDir, repo);
    await repo.open();
  }
  return repos.get(rootDir);
}

// for rapid
async function gitAdd(rootDir, absFilename){
  const git = await getGitOperator(rootDir);
  return git.add(absFilename);
}

// for rapid (future release)
async function gitRm(rootDir, absFilename){
  const git = await getGitOperator(rootDir);
  return git.rm(absFilename);
}


module.exports.add=gitAdd;
module.exports.rm=gitRm;
module.exports.getGitOperator=getGitOperator;
