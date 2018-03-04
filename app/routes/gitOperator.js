const path = require("path");
const nodegit = require("nodegit");
const {replacePathsep} = require('./utility');

/**
 * git operation class
 */
class git{
  constructor(rootDir){
    this.rootDir = rootDir;
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
    const filename = replacePathsep(path.relative(this.rootDir, absFilename));
    await this.index.addByPath(filename);
    return this.index.write()
  }
  /**
   * perform git rm
   * @param {string} absFilePath - target filepath
   */
  async rm(absFilename){
    const filename = replacePathsep(path.relative(this.rootDir, absFilename));
    await this.index.removeByPath(filename);
    return this.index.write()
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

module.exports=git;
