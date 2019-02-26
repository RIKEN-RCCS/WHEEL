winHelper={
  scriptName: "run.bat",
  scriptHeader: "@echo off",
  pwdCmd: "cd",
  referenceEnv: (env)=>{
    return `%${env}%`;
  }
}
posixHelper={
  scriptName: "run.sh",
  scriptHeader: "#!/bin/bash",
  pwdCmd: "pwd",
  referenceEnv: (env)=>{
    return "${"+env+"}";
  }
}

module.exports=process.platform === "win32"?winHelper:posixHelper;
