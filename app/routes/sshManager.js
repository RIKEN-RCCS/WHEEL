const {promisify} = require("util");
const fs = require('fs');

const ARsshClient = require('arssh2-client');

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
    config.passphrase = password;
    config.password = undefined;
  }else{
    config.privateKey = undefined;
    config.passphrase = undefined;
    config.password = password;
  }

  let arssh = getSsh(config, {connectionRetryDelay: 100});
  return arssh.canConnect()
    .catch((err)=>{
      if(config.hasOwnProperty('privateKey')) config.privateKey='privateKey was defined but omitted'
      if(config.hasOwnProperty('password')) config.password='password  was defined but omitted'
      if(config.hasOwnProperty('passphrase')) config.passphrase='passphrase  was defined but omitted'
      err.config = config;
      return Promise.reject(err);
    });
}

function getSsh(config, opt){
  let arssh = pool.find((e)=>{
    return e.config.host === config.host && e.config.username === config.username
  });
  if(arssh === undefined){
    arssh = new ARsshClient(config, opt);
  }else{
    for (let i in config){
      arssh.changeConfig(i, config[i]);
    }
    for (let i in opt){
      arssh.changeConfig(i, opt[i]);
    }
  }
  pool.push(arssh);
  return arssh;
}

module.exports.canConnect=canConnect;
module.exports.getSsh=getSsh;
