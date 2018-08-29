class posSchema {
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

class taskSchema extends BaseWorkflowComponentSchema {
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

class workflowSchema extends BaseWorkflowComponentSchema {
  constructor() {
    super();
    this.properties.type = { enum: ["workflow"] };
  }
}

class foreachSchema extends BaseWorkflowComponentSchema {
  constructor() {
    super();
    this.properties.type = { enum: ["foreach"] };
    this.properties.indexList = { type: "array" };
  }
}

function getSchema(type) {
  switch (type) {
    case "pos":
      return new posSchema();
    case "task":
      return new taskSchema();
    case "workflow":
      return new workflowSchema();
    case "foreach":
      return new foreachSchema();
  }
}

module.exports = getSchema;
