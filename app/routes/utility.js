const {promisify} = require('util');
const path = require('path');

const fs = require('fs-extra');
const Mode = require('stat-mode');

const {extProject, extWF, extPS, extFor, extWhile, extForeach} = require('../db/db');

/**
 * check if ssh connection can be established
 * @param {hostinfo} hotsInfo - remote host setting
 * @param {string} password - password or passphrase for private key
 */
async function createSshConfig(hostInfo, password){
  const config={
    host: hostInfo.host,
    port: hostInfo.port,
    username: hostInfo.username
  }
  if(hostInfo.keyFile){
    config.privateKey = await fs.readFile(hostInfo.keyFile);
    config.privateKey = config.privateKey.toString();
    if(password){
      config.passphrase = password;
      config.password = undefined;
    }
  }else{
    config.privateKey = undefined;
    if(password){
      config.passphrase = undefined;
      config.password = password;
    }
  }
  return config;
}


/**
 * convert to posix-style path string and remove head and tail path separator
 */
function normalizePath(pathString){
  let rt=pathString;
  // path.posix.sep('/') is disallowed as filename letter on windows OS
  // but posix allow path.win32.sep('\').
  if(pathString.includes(path.posix.sep)){
    let pathObj=path.posix.parse(pathString);
    rt = path.posix.join(pathObj.dir, pathObj.base);
  }else if(pathString.includes(path.win32.sep)){
    let pathObj=path.win32.parse(pathString);
    rt = path.posix.join(pathObj.dir.split(path.win32.sep), pathObj.base);
  }
  return rt;
}

/**
 * escape meta character of regex (from MDN)
 * @param {string} string - target string which will be escaped
 * @return {string} escaped regex string
 */
function escapeRegExp(string) {
  return string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");
}

/**
 * add execute permission to file
 * @param {string} file - filename in absolute path
 */
function addXSync(file){
  let stat = fs.statSync(file);
  let mode = new Mode(stat);
  let u=4;
  let g=4;
  let o=4;
  if(mode.owner.read) u+=1;
  if(mode.owner.write) u+=2;
  if(mode.group.read) g+=1;
  if(mode.group.write) g+=2;
  if(mode.others.read) o+=1;
  if(mode.others.write) o+=2;
  let modeString = u.toString()+g.toString()+o.toString();
  fs.chmodSync(file, modeString);
}

function getDateString (humanReadable = false){
  let now = new Date;
  let yyyy = `0000${now.getFullYear()}`.slice(-4);
  let month = now.getMonth()+1;
  let mm = `00${month}`.slice(-2);
  let dd = `00${now.getDate()}`.slice(-2);
  let HH = `00${now.getHours()}`.slice(-2);
  let MM = `00${now.getMinutes()}`.slice(-2);
  let ss = `00${now.getSeconds()}`.slice(-2);

  return humanReadable? `${yyyy}/${mm}/${dd}-${HH}:${MM}:${ss}`:`${yyyy}${mm}${dd}-${HH}${MM}${ss}`;
}

/**
 * replace path.win32.sep by path.posix.sep
 */
function replacePathsep(pathString){
  return pathString.replace(new RegExp("\\"+path.win32.sep,"g"), path.posix.sep);
}

/**
 * determine do cleanup or not
 * @param {number || string} flag - cleanup flag
 * @param {number || string} parentflag - parent component's cleanup flag
 */
function doCleanup(flag, parentFlag){
  const numFlag = parseInt(flag, 10);
  if(numFlag === 2){
    const numParentFlag = parseInt(parentFlag, 10);
    return parentFlag === 0;
  }
  return numFlag === 0;
}

/**
 * determin specified name is valid file/directory name or not
 */
function isValidName(name){
  const win32reservedName = /(CON|PRN|AUX|NUL|CLOCK$|COM[0-9]|LPT[0-9])\..*$/i;
  if(win32reservedName.test(name)) return false;

  const notAllowedChar = /[^a-zA-Z0-9_\-]/; //alphanumeric, '_', and '-'
  if(notAllowedChar.test(name)) return false;

  return true;
}

/**
 * return regexp of systemfiles
 */
function getSystemFiles(){
  return new RegExp(`^(?!^.*(${escapeRegExp(extProject)}|${escapeRegExp(extWF)}|${escapeRegExp(extPS)}|${escapeRegExp(extFor)}|${escapeRegExp(extWhile)}|${escapeRegExp(extForeach)}|.gitkeep)$).*$`);
}

module.exports.escapeRegExp     = escapeRegExp;
module.exports.addXSync         = addXSync;
module.exports.getDateString    = getDateString;
module.exports.replacePathsep   = replacePathsep;
module.exports.doCleanup        = doCleanup;
module.exports.isValidName      = isValidName;
module.exports.getSystemFiles   = getSystemFiles;
module.exports.createSshConfig = createSshConfig;
