/**
 * storage/etl/actions.js
 */
const { StorageError } = require("@dictadata/storage-junctions/types");
const { replace } = require("@dictadata/storage-junctions/utils");
const { logger } = require('../utils');
const fs = require('node:fs/promises');

var fnActions = new Map();

function use(name, fn) {
  fnActions.set(name, fn);
}

/**
 * If "action" is not defined in the fiber then action defaults to the fiber.name.
 *
 * @param {Object} fiber
 * @param {Object} params
 */
async function perform(fiber, params) {
  let retCode = 0;

  if (typeof fiber !== 'object')
    throw new StorageError(422, "Invalid parameter: fiber " + fiber.name);

  try {
    replace(fiber, params);
  }
  catch (err) {
    logger.warn(err);
    retCode = 1;
  }

  // determine action
  let action = fiber.action || fiber.name?.substr(0, fiber.name?.indexOf('_')) || fiber.name;

  logger.info("ETL " + action + " " + fiber.name);

  // check to read encodings from file
  try {
    logger.debug(">>> check origin encoding");
    if (typeof fiber.origin?.options?.encoding === "string") {
      let filename = fiber.origin.options.encoding;
      fiber.origin.options.encoding = JSON.parse(await fs.readFile(filename, "utf8"));
    }
  }
  catch (err) {
    logger.warn(err);
    fiber.origin.options.encoding = null;  // remove filename
    retCode = 1;
  }

  try {
    logger.debug(">>> check terminal encoding");
    if (typeof fiber.terminal?.options?.encoding === "string") {
      let filename = fiber.terminal.options.encoding;
      fiber.terminal.options.encoding = JSON.parse(await fs.readFile(filename, "utf8"));
    }
  }
  catch (err) {
    logger.warn(err);
    fiber.terminal.options.encoding = null; // remove filename
  }

  // process the action
  let fn = fnActions.get( action );
  if (fn) {
    retCode = await fn(fiber);
  }
  else {
    logger.error("unknown action: " + action);
    retCode = 1;
  }

  return retCode;
}

module.exports.use = use;
module.exports.perform = perform;
