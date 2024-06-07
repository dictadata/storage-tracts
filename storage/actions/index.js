/**
 * storage/etl/actions.js
 */
"use strict";

const { StorageError } = require('@dictadata/storage-junctions/types');
const { logger } = require('@dictadata/lib');
const { replace } = require('@dictadata/lib/utils');
const { readFile } = require('node:fs/promises');

class Actions {

  static use(name, fn) {
    Actions.fnActions.set(name, fn);
  }

  /**
   * If "action" is not defined in the fiber then action defaults to the fiber.name.
   *
   * @param {Object} fiber
   * @param {Object} params
   */
  static async perform(fiber, params) {
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

    // check to read options.encodings from file
    try {
      logger.debug(">>> check origin encoding for filename");
      if (typeof fiber.origin?.options?.encoding === "string") {
        let filename = fiber.origin.options.encoding;
        fiber.origin.options.encoding = JSON.parse(await readFile(filename, "utf8"));
      }
    }
    catch (err) {
      logger.warn(err);
      fiber.origin.options.encoding = null;  // remove filename
      retCode = 1;
    }

    try {
      logger.debug(">>> check terminal(s) encoding for filename");
      let terminals = fiber.terminals || fiber.terminal ? [ fiber.terminal ] : [];
      for (let terminal of terminals) {
        if (typeof terminal?.options?.encoding === "string") {
          let filename = terminal.options.encoding;
          terminal.options.encoding = JSON.parse(await readFile(filename, "utf8"));
        }
      }
    }
    catch (err) {
      logger.warn(err);
      fiber.terminal.options.encoding = null; // remove filename
    }

    // process the action
    let fn = Actions.fnActions.get(action);
    if (fn) {
      retCode = await fn(fiber);
    }
    else {
      logger.error("unknown action: " + action);
      retCode = 1;
    }

    return retCode;
  }

}

module.exports = exports = Actions;

// static properties
Actions.fnActions = new Map();
