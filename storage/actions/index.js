/**
 * storage/etl/actions.js
 */
const { Tracts } = require("../tracts");
const { StorageError } = require("@dictadata/storage-junctions/types");
const { logger } = require('../utils');
const fs = require('fs/promises');

var fnActions = {};

function use(name, fn) {
  fnActions[ name ] = fn;
}

/**
 *
 * @param {String|Object} tracts tracts URN or tracts container object
 * @param {Object} params name/value parameters
 */
async function perform(tracts, name, params)
{
  let retCode = 0;

  // if URN then recall from tracts
  if (typeof tracts === "string") {
    let results = await Tracts.tracts.recall(urn, true);
    tracts = results.data[ urn ];
  }

  if (name === "all" || name === "*") {
    for (const tract of tracts.tracts) {
      if (tract.name[ 0 ] === "_")
        continue;
      retCode = await performTract(tract, params);
      if (retCode)
        break;
    }
  }
  else if (name === "parallel") {
    let tasks = [];
    for (const tract of tracts.tracts) {
      if (tract.name[ 0 ] === "_")
        continue;
      tasks.push(performTract(tract, params));
    }
    Promise.allSettled(tasks);
  }
  else {
    let tract = tracts.tracts.find((tract) => tract.name === name);
    if (tract)
      retCode = await performTract(tract, params);
    else {
      retCode = 1
      logger.error("tract name not found: " + name);
    }
  }

  return retCode;
}

/**
 * If "action" is not defined in the tract then action defaults to the tract.name.
 *
 * @param {*} tract
 */
async function performTract(tract, params) {
  let retCode = 0;

  if (typeof tract !== 'object')
    throw new StorageError(422, "Invalid parameter: tract " + tract.name);

  // simple text replacement of "${variable}" in tracts
  let tractText = JSON.stringify(tract);
  for (let [ name, value ] of Object.entries(params)) {
    var regex = new RegExp("\\${" + name + "}", "g");
    tractText = tractText.replace(regex, value);
  }
  tract = JSON.parse(tractText);

  // determine action name
  let action = tract[ "action" ] || tract.name?.substr(0, tract.name?.indexOf('_')) || tract.name;

  logger.info("ELT " + action + " " + tract.name);

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
    retCode = 1;
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
    retCode = await fn(tract);
  }
  else {
    logger.error("unknown action: " + action);
    retCode = 1;
  }

  return retCode;
}

module.exports.use = use;
module.exports.perform = perform;
module.exports.performTract = performTract
