import fs = require('fs');
import path=require('path');
import uuidv1=require('uuid/v1');
import logger=require('./logger');

const config=require('./config/server');
var projectList=[];
var projectListFilename=path.resolve('dst', config.projectList)+'.json';

fs.readFile(projectListFilename, function(err, data){
  if(err) {
    logger.info(`project list file read failed. (${projectListFilename})`);
    logger.info('using empty list as initial state');
    return;
  }
  var fileData=JSON.parse(data.toString());
  if (! Array.isArray(fileData)){
    logger.info(`project list file has illegal data structure. (${projectListFilename})`);
    logger.info('using empty list as initial state');
    return;
  }
  projectList=fileData;
});

var writing=false;
var writeProjectListFile = function() {
  if(writing){
    logger.debug('skip writing projectList at this time');
    return;
  }
  writing=true;
  fs.writeFile(projectListFilename, JSON.stringify(projectList, null, 4), function(){
    writing=false;
  });
}

/**
 * 条件に一致するプロジェクトを返す
 * @param query プロジェクトIDまたはpath
 * labelは重複する可能性があるため、labelでは検索できないようにしている。
 * 必要であれば、getAllProjectで取り出した後でfilterすること
 */
export function getProject(query: string){
  return projectList.find(function(item){
    if (item.id == query || item.path == query) return true;
  });

}

export function getAllProject() {
  return Array.from(projectList);
}

export function reorder(newOrder: number[]){
  if(projectList.length != newOrder.length){
    logger.warn(`illegal reorder array. original length: ${projectList.length} reorder array length: ${newOrder.length}`);
  }
  //TODO newOrderが元と同じ順序だったらそのまま終了
  var tmp=[];
  var index=0;
  for( var i of newOrder){
    tmp[index] = projectList[i];
    index++;
  }
  projectList=Array.from(tmp);
  writeProjectListFile();
}
export function remove(id: string){
  var numProjects=projectList.length;
  projectList=projectList.filter((item)=>{
    return(item.id != id);
  });
  if(projectList.length!=numProjects){
    writeProjectListFile();
  }
}
export function rename(newLabel, oldLabel){
  if(newLabel == oldLabel) return;
  projectList=projectList.map((item)=>{
    if(item.label == oldLabel) item.label = newLabel;
  });
  writeProjectListFile();
}

export function add(label: string, path: string)
{
  var exists= projectList.some(function(item){
    return item.path == path
  });
  if(exists) return;
  var uuid=uuidv1();
  projectList.push({"label": label, "path": path, "id": uuid});
  writeProjectListFile();
}
