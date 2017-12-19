const {promisify} = require('util');
const fs = require('fs');

const ncp = require('ncp').ncp;
const Mode = require('stat-mode');

const getSsh = require('./sshManager');

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

  getDateString (){
    let now = new Date;
    let yyyy = `0000${now.getFullYear()}`.slice(-4);
    let mm = `00${now.getMonth()}`.slice(-2);
    let dd = `00${now.getDate()}`.slice(-2);
    let HH = `00${now.getHours()}`.slice(-2);
    let MM = `00${now.getMinutes()}`.slice(-2);
    let ss = `00${now.getSeconds()}`.slice(-2);

    return `${yyyy}${mm}${dd}-${HH}${MM}${ss}`;
  }



}

module.exports=new Utility;
