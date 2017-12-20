#!/usr/bin/env node
const path = require('path');
const opener = require('opener');
const waitOn = require('wait-on');

let {port} = require('./db/db');
//TODO impliment argument parser and suppress opening browser in multi user mode
let url = `http://localhost:${port}`;
let opt = {
  resources: [url],
  delay: 500,
  timeout: 3000
}
waitOn(opt, (err)=>{
  if(err){
    console.log('fatal error occurred during waiting http server up',err);
    return;
  }
  opener(url);
});
require('WHEEL')
