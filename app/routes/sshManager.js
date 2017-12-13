const {promisify} = require("util");
const fs = require('fs');

const ARsshClient = require('arssh2-client');

let pool = []

let getSsh = (config, opt)=>{
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

module.exports=getSsh;
