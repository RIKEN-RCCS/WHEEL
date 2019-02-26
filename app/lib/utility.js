'use strict';


//NG
const reWin32ReservedNames = /(CON|PRN|AUX|NUL|CLOCK$|COM[0-9]|LPT[0-9])\..*$/i;
const reOnlyWhilteSpace = /^\s*$/;
//OK
const alphanumeric = "a-zA-Z0-9";
//due to escapeRegExp's spec, bars must be added separately any other regexp strings
//eslint-disable-next-line no-useless-escape
const bars = "_\-";
const pathseps = "/\\";
const metaCharactors = "*?[]{}()!?+@.";

/**
 * escape meta character of regex (from MDN)
 * please note that this function can not treat '-' in the '[]'
 * @param {string} string - target string which will be escaped
 * @returns {string} escaped regex string
 */
function escapeRegExp(string) {
  //eslint-disable-next-line no-useless-escape
  return string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");
}

function isSane(name){
  if (typeof name !== "string") {
    return false;
  }
  if(reOnlyWhilteSpace.test(name)){
    return false
  }
  if (reWin32ReservedNames.test(name)) {
    return false;
  }
  return true;
}

/**
 * determin specified name is valid file/directory name or not
 */
function isValidName(name) {
  if(! isSane(name)){
    return false;
  }

  const forbidonChars = new RegExp(`[^${escapeRegExp(alphanumeric) + bars}]`);
  if (forbidonChars.test(name)) {
    return false;
  }
  return true;
}
function isValidInputFilename(name) {
  if(! isSane(name)){
    return false;
  }

  const forbidonChars = new RegExp(`[^${escapeRegExp(`${alphanumeric + pathseps}.`) + bars}]`);
  if (forbidonChars.test(name)) {
    return false;
  }
  return true;
}

function isValidOutputFilename(name) {
  if(! isSane(name)){
    return false;
  }

  const forbidonChars = new RegExp(`[^${escapeRegExp(alphanumeric + pathseps + metaCharactors) + bars}]`);
  if (forbidonChars.test(name)) {
    return false;
  }
  return true;
}

module.exports={
  isValidName,
  isValidInputFilename,
  isValidOutputFilename,
  reWin32ReservedNames,
  pathseps,
  metaCharactors,
  escapeRegExp
}
