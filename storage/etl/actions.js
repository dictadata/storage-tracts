/**
 * storage/etl/actions.js
 */
const { StorageError } = require("@dictadata/storage-junctions/types");
const logger = require('./logger');
const fs = require('fs/promises');

var fnActions = {};

function addAction(name, fn) {
  fnActions[ name ] = fn;
}

/**
 * If "action" is not defined in the tract then action defaults to the tractName.
 *
 * @param {*} tractName
 * @param {*} tract
 */
async function performAction(tractName, tract) {
  if (typeof tract !== 'object')
    throw new StorageError(422, "Invalid parameter: tract " + tractName);

  // determine action name
  let action = tract[ "action" ] || tractName.substr(0, tractName.indexOf('_')) || tractName;

  logger.info("ELT " + action + " " + tractName);

  // check to read encodings from file
  try {
    logger.debug(">>> check origin encoding");
    if (typeof tract.origin?.options?.encoding === "string") {
      let filename = tract.origin.options.encoding;
      tract.origin.options.encoding = JSON.parse(await fs.readFile(filename, "utf8"));
    }
  }
  catch (err) {
    logger.warn(err);
    tract.origin.options.encoding = null;  // remove filename
  }

  try {
    logger.debug(">>> check terminal encoding");
    if (typeof tract.terminal?.options?.encoding === "string") {
      let filename = tract.terminal.options.encoding;
      tract.terminal.options.encoding = JSON.parse(await fs.readFile(filename, "utf8"));
    }
  }
  catch (err) {
    logger.warn(err);
    tract.terminal.options.encoding = null; // remove filename
  }

  // process the tract
  let fn = fnActions[ action ];
  if (fn) {
    return await fn(tract);
  }
  else {
    logger.error("unknown action: " + action);
    return 1;
  }

}

module.exports.addAction = addAction;
module.exports.performAction = performAction;
