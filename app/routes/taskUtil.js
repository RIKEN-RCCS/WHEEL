const {remoteHost, jobScheduler} = require('../db/db');
const {getLogger} = require('../logSettings');

const logger = getLogger('workflow');

async function cancelRemoteJob(task, ssh){
  const hostinfo = remoteHost.get(task.remotehostID);
  const JS = jobScheduler[hostinfo.jobScheduler];
  const cancelCmd = `${JS.del} ${task.jobID}`;
  logger.debug(`cancel job: ${cancelCmd}`);
  const output=[];
  await ssh.exec(cancelCmd, {}, output, output);
  logger.debug('cacnel done', output.join());
}
async function cancelLocalJob(task){
  console.log("not implimented yet!!");
}
async function killLocalProcess(task){
  if(task.handler && task.handler.connect) task.handler.kill();
}

async function killTask(task){
  if(task.remotehostID !== 'localhost'){
    const hostinfo = remoteHost.get(task.remotehostID);
    if(task.useJobScheduler){
      const arssh = getSsh(task.label, hostinfo.host);
      await cancelRemoteJob(task, arssh);
    }else{
      // do nothing for remoteExec at this time
    }
  }else{
    if(task.useJobScheduler){
      await cancelLocalJob(task);
    }else{
      await killLocalProcess(task);
    }
  }
}

module.exports.killTask = killTask;
