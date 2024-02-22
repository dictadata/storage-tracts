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
  let srcType = typeOf(src, true);

  if (srcType === "Object" || srcType === "SMT") {
    for (let [name, value] of Object.entries(src))
      src[ name ] = replace(value, params);
  }
  else if (srcType === "Array") {
    for (let i = 0; i < src.length; i++)
      src[i] = replace(src[i], params);
  }
  else if (srcType === "String") {
    if (src.indexOf("=${") === 0) {
      // replace the entire value, e.g. number, boolean or object
      for (let [ pname, pval ] of Object.entries(params)) {
        if (src.indexOf("=${" + pname + "}") === 0) {
          src = pval;
          break;
        }
      }
    }
    else if (src.indexOf("${") >= 0) {
      // replace values inside a string
      for (let [ pname, pval ] of Object.entries(params)) {
        var regex = new RegExp("\\${" + pname + "}", "g");
        src = src.replace(regex, pval);
      }
    }
  }

  return src;
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
    action = replace(action, params);
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
