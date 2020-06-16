"use strict";


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


//TODO define re object outside of functions
//
/**
 * escape meta character of regex (from MDN)
 * please note that this function can not treat '-' in the '[]'
 * @param {string} target - target string which will be escaped
 * @returns {string} escaped regex string
 */
/**
 *
 *
 * @param {*} target
 * @returns
 */
function escapeRegExp(target) {
  //eslint-disable-next-line no-useless-escape
  return target.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");
}

/**
 *
 *
 * @param {*} name
 * @returns
 */
function isSane(name) {
  if (typeof name !== "string") {
    return false;
  }
  if (reOnlyWhilteSpace.test(name)) {
    return false;
  }
  if (reWin32ReservedNames.test(name)) {
    return false;
  }
  return true;
}

/**
 * determin specified name is valid file or directory name or not
 * @param {strint} name - name to be checked
 * @returns {boolean} - return true if it is ok
 */
/**
 *
 *
 * @param {*} name
 * @returns
 */
function isValidName(name) {
  if (!isSane(name)) {
    return false;
  }

  const forbidonChars = new RegExp(`[^${escapeRegExp(alphanumeric) + bars}]`);
  if (forbidonChars.test(name)) {
    return false;
  }
  return true;
}

/**
 * determin specified name is valid for inputFilename
 * @param {strint} name - name to be checked
 * @returns {boolean} - return true if it is ok
 */
/**
 *
 *
 * @param {*} name
 * @returns
 */
function isValidInputFilename(name) {
  if (!isSane(name)) {
    return false;
  }

  const forbidonChars = new RegExp(`[^${escapeRegExp(`${alphanumeric + pathseps}.`) + bars}]`);
  if (forbidonChars.test(name)) {
    return false;
  }
  return true;
}

/**
 * determin specified name is valid for outputputFilename
 * @param {string} name - name to be checked
 * @returns {boolean} - return true if it is ok
 */
/**
 *
 *
 * @param {*} name
 * @returns
 */
function isValidOutputFilename(name) {
  if (!isSane(name)) {
    return false;
  }

  const forbidonChars = new RegExp(`[^${escapeRegExp(alphanumeric + pathseps + metaCharactors) + bars}]`);
  if (forbidonChars.test(name)) {
    return false;
  }
  return true;
}

/*
 * get date as string
 * @param {boolean} humanReadable - option flag for using delimiters(/and:) or not
 * @param {boolean} withMiliseconds - option flag for time resolution
 * return {string}
 */
/**
 *
 *
 * @param {boolean} [humanReadable=false]
 * @param {boolean} [withMilliseconds=false]
 * @returns
 */
function getDateString(humanReadable = false, withMilliseconds = false) {
  const now = new Date();
  const yyyy = `0000${now.getFullYear()}`.slice(-4);
  const month = now.getMonth() + 1;
  const mm = `00${month}`.slice(-2);
  const dd = `00${now.getDate()}`.slice(-2);
  const HH = `00${now.getHours()}`.slice(-2);
  const MM = `00${now.getMinutes()}`.slice(-2);
  const ss = `00${now.getSeconds()}`.slice(-2);
  const ms = `000${now.getMilliseconds()}`.slice(-3);
  if (humanReadable) {
    return withMilliseconds ? `${yyyy}/${mm}/${dd}-${HH}:${MM}:${ss}.${ms}` : `${yyyy}/${mm}/${dd}-${HH}:${MM}:${ss}`;
  }
  return withMilliseconds ? `${yyyy}${mm}${dd}-${HH}${MM}${ss}${ms}` : `${yyyy}${mm}${dd}-${HH}${MM}${ss}`;
}


module.exports = {
  escapeRegExp,
  isValidName,
  isValidInputFilename,
  isValidOutputFilename,
  reWin32ReservedNames,
  pathseps,
  metaCharactors,
  getDateString,
  escapeRegExp
};
