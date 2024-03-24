/**
 * storage/etl/scan
 */
"use strict";

const Storage = require("../storage");
const { objCopy } = require('@dictadata/storage-junctions/utils');
const { logger } = require('../utils');
const { perform } = require('./');

/**
 * List schemas at a locus
 * and perform action(s) on each schema.
 */
module.exports = async (fiber) => {
  logger.info("=== scan");
  logger.verbose(fiber.origin.smt);
  let retCode = 0;

  var jo;
  try {
    // get list of schemas from source
    if (!fiber.origin.options)
      fiber.origin.options = {};
    jo = await Storage.activate(fiber.origin.smt, fiber.origin.options);
    let { data: list } = await jo.list();
    jo.relax();

    // exlusions
    let exclude = [];
    if (fiber.origin.options?.exclude) {
      for (let filespec of fiber.origin.options.exclude) {
        let rx = '^' + filespec + '$';
        rx = rx.replace(/\./g, '\\.');
        rx = rx.replace(/\?/g, '.');
        rx = rx.replace(/\*/g, '.*');
        rx = new RegExp(rx);
        exclude.push(rx);
      }
    }

    // loop through list and process each schema
    for (let entry of list) {
      logger.info(entry.name);

      // check exclusion list
      let skip = false;
      for (let rx of exclude) {
        if (rx.test(entry.name)) {
          skip = true;
          break;
        }
      }
      if (skip) {
        logger.warn("excluded: " + entry.name);
        continue;
      }

      // set string replacement values
      let replacements = {
        "rpath": entry.rpath || entry.name,
        "name": entry.name,
        "schema": entry.name.substr(0, entry.name.lastIndexOf("."))
      };

      // loop thru sub-tracts
      for (const sub of fiber.fibers) {
        let subfiber = objCopy({}, sub);

        retCode = await perform(subfiber, replacements);
        if (retCode)
          break;
      }

      if (retCode)
        break;
    }

    /* could record some result logging
    if (fiber.terminal?.output) {
      logger.debug(JSON.stringify(<results>, null, " "));
      retCode = output(fiber.terminal.output, <results>, fiber.terminal.compareValues);
    }
    */

    logger.info("=== completed");
  }
  catch (err) {
    logger.error("scan: " + err.message);
    retCode = 1;
  }
  finally {
    if (jo) await jo.relax();
  }

  return retCode;
};
