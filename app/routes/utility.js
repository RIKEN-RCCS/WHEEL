const {promisify} = require('util');
const fs = require('fs');

const ncp = require('ncp').ncp;
const Mode = require('stat-mode');

class Utility {
  /**
   * escape meta character of regex (from MDN)
   * @param {string} string - target string which will be escaped
   * @return {string} escaped regex string
   */
  escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");
  }

  /**
   * add execute permission to file
   * @param {string} file - filename in absolute path
   */
  addXSync(file){
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

  /**
   * promise version of ncp
   * @param {string} src - src directory
   * @param {string} dst - dst directory
   * @param {Object} options - see ncp's npm page
   */
  asyncNcp(...args){
    return new Promise((resolve, reject)=>{
      ncp(...args, (err)=>{
        if(err) reject(err);
        resolve(null);
      });
    });
  }

  async readPrivateKey(keyFile, config, password){
    if(keyFile){
      let tmp = await promisify(fs.readFile)(keyFile);
      config.privateKey = tmp.toString();
      config.passphrase = password;
      config.password = undefined;
    }else{
      config.privateKey = undefined;
      config.passphrase = undefined;
      config.password = password;
    }
  }
}

module.exports=new Utility;
