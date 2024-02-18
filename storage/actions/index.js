/**
 * storage/etl/actions.js
 */
const { StorageError } = require("@dictadata/storage-junctions/types");
const { typeOf } = require("@dictadata/storage-junctions/utils");
const { logger } = require('../utils');
const fs = require('fs/promises');

var fnActions = {};

function use(name, fn) {
  fnActions[ name ] = fn;
}

/**
 * text replacement of "${variable}" in tracts
 * @param {Object} src object that contains properties
 * @param {Object} params the parameter values
 * @returns
 */
function replace(src, params) {
  if (typeOf(src) !== "object")
    return;

  let names = Object.keys(src);
  for (let name of names) {
    let value = src[ name ];
    let srcType = typeOf(value, true);

    if (srcType === "Object" || srcType === "SMT") {
      replace(value, params);
    }
    else if (srcType === "String") {
      if (value.indexOf("${") >= 0) {
        for (let [ pname, pval ] of Object.entries(params)) {
          var regex = new RegExp("\\${" + pname + "}", "g");
          value = value.replace(regex, pval);
        }
        src[ name ] = value;
      }
    }
  }

  return src;
}

/**
 * text replacement of "${variable}" in tracts
 * @param {Object} src object that contains properties
 * @param {Object} params the parameter values
 * @returns
 */
function replaceX(src, params) {
  let to = typeOf(src.terminal.options.writer);

  let text = JSON.stringify(src);

  for (let [ name, value ] of Object.entries(params)) {
    var regex = new RegExp("\\${" + name + "}", "g");
    value = value.replace(regex, pval);
  }

  return JSON.parse(text);
}

/**
 * If "action" is not defined in the action then action defaults to the action.name.
 *
 * @param {*} action
 */
async function perform(action, params) {
  let retCode = 0;

  if (typeof action !== 'object')
    throw new StorageError(422, "Invalid parameter: action " + action.name);

  try {
    replace(action, params);
  }
  catch (err) {
    logger.warn(err);
    retCode = 1;
  }

  // determine action command
  let command = action[ "action" ] || action.name?.substr(0, action.name?.indexOf('_')) || action.name;

  logger.info("ELT " + command + " " + action.name);

  // check to read encodings from file
  try {
    logger.debug(">>> check origin encoding");
    if (typeof action.origin?.options?.encoding === "string") {
      let filename = action.origin.options.encoding;
      action.origin.options.encoding = JSON.parse(await fs.readFile(filename, "utf8"));
    }
  }
  catch (err) {
    logger.warn(err);
    action.origin.options.encoding = null;  // remove filename
    retCode = 1;
  }

  try {
    logger.debug(">>> check terminal encoding");
    if (typeof action.terminal?.options?.encoding === "string") {
      let filename = action.terminal.options.encoding;
      action.terminal.options.encoding = JSON.parse(await fs.readFile(filename, "utf8"));
    }
  }
  catch (err) {
    logger.warn(err);
    action.terminal.options.encoding = null; // remove filename
  }

  // process the action
  let fn = fnActions[ command ];
  if (fn) {
    retCode = await fn(action);
  }
  else {
    logger.error("unknown action: " + command);
    retCode = 1;
  }

  return retCode;
}

module.exports.use = use;
module.exports.perform = perform;
