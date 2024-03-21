/**
 * storage/etl/actions.js
 */
const { StorageError } = require("@dictadata/storage-junctions/types");
const { typeOf, objCopy, replace } = require("@dictadata/storage-junctions/utils");
const { logger } = require('../utils');
const fs = require('node:fs/promises');

var fnActions = {};

function use(name, fn) {
  fnActions[ name ] = fn;
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

  logger.info("ETL " + command + " " + action.name);

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
