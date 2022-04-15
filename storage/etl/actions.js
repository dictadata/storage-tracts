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
 *
 * @param {*} tractName
 * @param {*} tract
 */
async function onTract(tractName, tract) {
  if (typeof tract !== 'object')
    throw new StorageError(422, "Invalid parameter: tract " + tractName);

  // determine action name
  let action = tract[ "action" ] || tractName.substr(0, tractName.indexOf('_')) || tractName;

  // check to read encodings from file
  try {
    logger.debug(">>> check origin encoding");
    if (tract.origin && tract.origin.options && typeof tract.origin.options.encoding === "string") {
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
    if (tract.terminal && tract.terminal.options && typeof tract.terminal.options.encoding === "string") {
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
    return fn(tract);
  }
  else {
    logger.error("unknown action: " + action);
    return 1;
  }

}

module.exports.addAction = addAction;
module.exports.onTract = onTract;
