async function runProject(projectRootDir){
  const projectJson = await readJsonGreedy(path.resolve(projectRootDir, projectJsonFilename));
  const rootWF = await getComponent(projectRootDir, path.join(projectRootDir, componentJsonFilename));
    
}
module.exports={
  runProject
}
