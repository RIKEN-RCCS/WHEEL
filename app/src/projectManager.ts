import fs=require('fs');
import path=require('path');
import ServerUtility = require('./serverUtility');
import logger = require('./logger');

export function create(directoryPath: string) {
  const config = require('../dst/config/server');
  const projectFileName: string = config.system_name;
  const workflowFileName: string = config.default_filename;

  const projectJson = ServerUtility.readTemplateProjectJson();
  const workflowJson = ServerUtility.readTemplateWorkflowJson();

  projectJson.path = `./${projectFileName}${config.extension.project}`;
  projectJson.path_workflow = `./${workflowFileName}${config.extension.workflow}`;

  workflowJson.name = `${workflowJson.name}1`;
  workflowJson.path = path.basename(directoryPath);

  const projectFilePath = path.join(directoryPath, projectJson.path);
  const workflowFilePath = path.join(directoryPath, projectJson.path_workflow);

  fs.mkdir(directoryPath, (err) => {
    if (err) {
      logger.error(err);
      return;
    }
    ServerUtility.writeJson(projectFilePath, projectJson, (err) => {
      if (err) {
        logger.error(err);
        return;
      }
      ServerUtility.writeJson(workflowFilePath, workflowJson, (err) => {
        if (err) {
          logger.error(err);
          return;
        }
      });
    });
  });
}
