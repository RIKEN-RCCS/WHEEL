"use strict";
class PosSchema {
  constructor() {
    this.required = ["x", "y"];
    this.properties = {
      x: { type: "number" },
      y: { type: "number" }
    };
    this.maxProperties = 2;
  }
}

class BaseWorkflowComponentSchema {
  constructor() {
    this.required = ["parent", "pos", "ID", "type", "name", "description", "previous", "next", "inputFiles", "outputFiles", "state", "cleanupFlag"];
    this.properties = {
      parent: { type: "string" },
      pos: getSchema("pos"),
      ID: { type: "string" },
      type: { enum: ["task", "if", "workflow", "parameterStudy", "for", "while", "foreach"] },
      name: { type: "string" },
      description: { type: "null" },
      previous: { type: "array" },
      next: { type: "array" },
      inputFiles: { type: "array" },
      outputFiles: { type: "array" },
      state: { type: "string" },
      cleanupFlag: { enum: [0, 1, 2] }
    };
  }
}

class TaskSchema extends BaseWorkflowComponentSchema {
  constructor() {
    super();
    this.required.push("script", "host", "useJobScheduler", "queue", "include", "exclude");
    this.properties.type = { enum: ["task"] };
    this.properties.script = { type: "null" };
    this.properties.host = { type: "string" };
    this.properties.useJobScheduler = { type: "boolean" };
    this.properties.queue = { type: "null" };
    this.properties.include = { type: "null" };
    this.properties.exclude = { type: "null" };
  }
}

class WorkflowSchema extends BaseWorkflowComponentSchema {
  constructor() {
    super();
    this.properties.type = { enum: ["workflow"] };
  }
}

class ForeachSchema extends BaseWorkflowComponentSchema {
  constructor() {
    super();
    this.properties.type = { enum: ["foreach"] };
    this.properties.indexList = { type: "array" };
  }
}

function getSchema(type) {
  let rt;

  switch (type) {
    case "pos":
      rt = new PosSchema();
      break;
    case "task":
      rt = new TaskSchema();
      break;
    case "workflow":
      rt = new WorkflowSchema();
      break;
    case "foreach":
      rt = new ForeachSchema();
      break;
    default:
      rt = null;
  }
  return rt;
}

module.exports = getSchema;
