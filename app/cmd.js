#!/usr/bin/env node
"use strict";
const opener = require("opener");
const waitOn = require("wait-on");
const { port } = require("./db/db");
//TODO impliment argument parser and suppress opening browser in multi user mode
const url = `http://localhost:${port}`;
const opt = {
  resources: [url],
  delay: 500,
  timeout: 3000
};
waitOn(opt, (err)=>{
  if (err) {
    //eslint-disable-next-line no-console
    console.log("fatal error occurred during waiting http server up", err);
    return;
  }
  opener(url);
});
require("./index");
