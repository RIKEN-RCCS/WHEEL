const scriptName = process.platform === "win32"?"run.bat":"run.sh";
const scriptHeader = process.platform === "win32"?"@echo off":"#!/bin/bash";
const pwdCmd = process.platform === "win32"?"cd":"pwd";

module.exports={
  scriptName,
  scriptHeader,
  pwdCmd
}

