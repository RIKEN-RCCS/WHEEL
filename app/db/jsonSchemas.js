"use strict";

class SrcSchema {
  constructor(srcNode, srcName) {
    this.required = ["srcNode", "srcName"];
    this.properties = {
      srcNode: { type: "string" },
      srcName: { type: "string" }
    };

    if (typeof srcNode !== "undefined" && typeof srcName !== "undefined") {
      this.properties.srcNode = { enum: [srcNode] };
      this.properties.srcName = { enum: [srcName] };
    }
  }
}

class DstSchema {
  constructor(dstNode, dstName) {
    this.required = ["dstNode", "dstName"];
    this.properties = {
      dstNode: { enum: [dstNode] },
      dstName: { enum: [dstName] }
    };
  }
}

class InputFileSchema {
  constructor(name, srcNode, srcName) {
    this.required = ["name", "src"];
    this.properties = {
      name: { type: "string" },
      src: { type: "array", items: [] },
      forwardTo: { type: "array", items: [] }
    };

    if (typeof name !== "undefined") {
      this.properties.name = { enum: [name] };
    }

    if (typeof srcNode !== "undefined" && typeof srcName !== "undefined") {
      this.properties.src.items.push(new SrcSchema(srcNode, srcName));
    }
  }
}

class OutputFileSchema {
  constructor(name, dstNode, dstName) {
    this.required = ["name", "dst"];
    this.properties = {
      name: { type: "string" },
      dst: { type: "array", items: [] },
      origin: { type: "array", items: [] }
    };

    if (typeof name !== "undefined") {
      this.properties.name = { enum: [name] };
    }

    if (typeof dstNode !== "undefined" && typeof dstName !== "undefined") {
      this.properties.dst.items.push(new DstSchema(dstNode, dstName));
    }
  }
}


class EmptyArraySchema {
  constructor() {
    this.type = "array";
    this.minItems = 0;
    this.maxItems = 0;
    this.items = { type: "string", enum: [] };
    this.uniqueItems = true;
  }
}

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
  constructor(name) {
    this.required = ["parent", "pos", "ID", "type", "name", "description", "previous", "next", "inputFiles", "outputFiles", "state", "cleanupFlag"];
    this.properties = {
      parent: { type: "string" },
      pos: getSchema("pos"),
      ID: { type: "string" },
      type: { enum: ["task", "if", "workflow", "parameterStudy", "for", "while", "foreach"] },
      name: { type: "string" },
      description: { oneOf: [{ type: "null" }, { type: "string" }] },
      previous: getSchema("emptyArray"),
      next: getSchema("emptyArray"),
      inputFiles: { type: "array", minItems: 0, maxItems: 0, items: [] },
      outputFiles: { type: "array", minItems: 0, maxItems: 0, items: [] },
      state: { enum: ["not-started", "running", "finished", "failed", "unknown"] },
      cleanupFlag: { enum: [0, 1, 2] }
    };

    if (typeof name !== "undefined") {
      this.properties.name = { enum: [name] };
    }
  }

  addInputFile(name, srcNode, srcName) {
    const tmp = new InputFileSchema(name, srcNode, srcName);
    this.properties.inputFiles.items.push(tmp);
    const size = this.properties.inputFiles.items.length;
    this.properties.inputFiles.minItems = size;
    this.properties.inputFiles.maxItems = size;
  }

  addInputFileLink(index, srcNode, srcName, isForward) {
    if (index > this.properties.inputFiles.items.length - 1) {
      return;
    }
    if (isForward) {
      const tmp = new DstSchema(srcNode, srcName);
      this.properties.inputFiles.items[index].properties.forwardTo.items.push(tmp);
    } else {
      const tmp = new SrcSchema(srcNode, srcName);
      this.properties.inputFiles.items[index].properties.src.items.push(tmp);
    }
  }

  addOutputFile(name, dstNode, dstName) {
    const tmp = new OutputFileSchema(name, dstNode, dstName);
    this.properties.outputFiles.items.push(tmp);
    const size = this.properties.outputFiles.items.length;
    this.properties.outputFiles.minItems = size;
    this.properties.outputFiles.maxItems = size;
  }

  addOutputFileLink(index, dstNode, dstName, isOrigin) {
    if (index > this.properties.outputFiles.items.length - 1) {
      return;
    }
    if (isOrigin) {
      const tmp = new SrcSchema(dstNode, dstName);
      this.properties.outputFiles.items[index].properties.origin.items.push(tmp);
    } else {
      const tmp = new DstSchema(dstNode, dstName);
      this.properties.outputFiles.items[index].properties.dst.items.push(tmp);
    }
  }

  addValue(prop, value) {
    this.properties[prop].items.enum.push(value);
    const size = this.properties[prop].items.enum.length;
    this.properties[prop].minItems = size;
    this.properties[prop].maxItems = size;
  }
}

class TaskSchema extends BaseWorkflowComponentSchema {
  constructor(name) {
    super(name);
    this.required.push("script", "host", "useJobScheduler", "queue", "include", "exclude");
    this.properties.type = { enum: ["task"] };
    this.properties.script = { type: "null" };
    this.properties.host = { type: "string" };
    this.properties.useJobScheduler = { type: "boolean" };
    this.properties.queue = { type: "null" };
    this.properties.include = { type: "null" };
    this.properties.exclude = { type: "null" };
    this.properties.state = this.properties.state.enum.concat(["stage-in", "waiting", "queued", "stage-out"]);
  }
}

class WorkflowSchema extends BaseWorkflowComponentSchema {
  constructor(name) {
    super(name);
    this.properties.type = { enum: ["workflow"] };
  }
}

class ForeachSchema extends BaseWorkflowComponentSchema {
  constructor(name) {
    super(name);
    this.required.push("indexList");
    this.properties.type = { enum: ["foreach"] };
    this.properties.indexList = { type: "array", minItems: 0, maxItems: 0 };
  }
}

function getSchema(type, name) {
  let rt;

  switch (type) {
    case "pos":
      rt = new PosSchema();
      break;
    case "task":
      rt = new TaskSchema(name);
      break;
    case "workflow":
      rt = new WorkflowSchema(name);
      break;
    case "foreach":
      rt = new ForeachSchema(name);
      break;
    case "emptyArray":
      rt = new EmptyArraySchema();
      break;
    default:
      rt = null;
  }
  return rt;
}

module.exports = getSchema;
