const {promisify} = require("util");
const fs = require('fs');

const ARsshClient = require('arssh2-client');

const logger = require("../logger");
let pool = []

async function canConnect(hostInfo, password){
  let config={
    host: hostInfo.host,
    port: hostInfo.port,
    username: hostInfo.username
  }
  if(hostInfo.keyFile){
    let tmp = await promisify(fs.readFile)(hostInfo.keyFile);
    config.privateKey = tmp.toString();
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

  let arssh = getSsh(config, {connectionRetryDelay: 100});
  return arssh.canConnect()
    .catch((err)=>{
      let config2 = Object.assign({}, config);
      if(config2.hasOwnProperty('privateKey')) config2.privateKey='privateKey was defined but omitted'
      if(config2.hasOwnProperty('password'))   config2.password='password  was defined but omitted'
      if(config2.hasOwnProperty('passphrase')) config2.passphrase='passphrase  was defined but omitted'
      err.config = config2;
      return Promise.reject(err);
    });
}

function getSsh(config, opt){
  let arssh = pool.find((e)=>{
    return e.config.host === config.host && e.config.username === config.username
  });
  if(arssh === undefined){
    logger.debug('create new ssh instance');
    arssh = new ARsshClient(config, opt);
    pool.push(arssh);
  }else{
    logger.debug('overwrite config and reuse existing ssh instance');
    arssh.overwriteConfig(config);
    for (let i in opt){
      arssh.changeConfig(i, opt[i]);
    }
  }
  return arssh;
}

module.exports.canConnect=canConnect;
module.exports.getSsh=getSsh;
