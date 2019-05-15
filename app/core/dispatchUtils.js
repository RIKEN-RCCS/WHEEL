"use strict";
const fs = require("fs-extra");
const path = require("path");
const childProcess = require("child_process");
const { addX } = require("./fileUtils");

/**
 * evalute condition by executing external command or evalute JS expression
 * @param {string} condition - command name or javascript expression
 */
async function evalCondition(condition, cwd, currentIndex, logger) {
  return new Promise(async(resolve, reject)=>{
    //condition is always string for now. but keep following just in case
    if (typeof condition === "boolean") {
      resolve(condition);
      return;
    }

    if (typeof condition !== "string") {
      logger.warn("condition must be string or boolean");
      reject(new Error(`illegal condition specified ${typeof condition} \n${condition}`));
      return;
    }
    const script = path.resolve(cwd, condition);

    if (await fs.pathExists(script)) {
      logger.debug("execute ", script);
      await addX(script);
      const dir = path.dirname(script);
      const options = {
        env: process.env,
        cwd: dir
      };

      if (typeof currentIndex === "number") {
        options.env.WHEEL_CURRENT_INDEX = currentIndex.toString();
      }
      const cp = childProcess.spawn(script, options, (err)=>{
        if (err) {
          reject(err);
        }
      });
      cp.on("close", (code)=>{
        logger.debug("return value of conditional expression = ", code);
        resolve(code === 0);
      });
      cp.stdout.on("data", (data)=>{
        logger.trace(data.toString());
      });
      cp.stderr.on("data", (data)=>{
        logger.trace(data.toString());
      });
    } else {
      logger.debug("evalute ", condition);
      let conditionExpression = "";

      if (typeof currentIndex === "number") {
        conditionExpression += `var WHEEL_CURRENT_INDEX=${currentIndex};`;
      }
      conditionExpression += condition;
      //eslint-disable-next-line no-eval
      resolve(eval(conditionExpression));
    }
  });
}

module.exports = {
  evalCondition
};
