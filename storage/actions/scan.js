/**
 * storage/etl/scan
 */
"use strict";

const Storage = require("../storage");
const { logger } = require('../utils');
const { perform } = require('./');

/**
 * List schemas at a locus
 * and perform action(s) on each schema.
 */
module.exports = async (action) => {
  logger.info("=== scan");
  logger.verbose(action.origin.smt);
  let retCode = 0;

  var jo;
  try {
    // get list of schemas from source
    if (!action.origin.options)
      action.origin.options = {};
    jo = await Storage.activate(action.origin.smt, action.origin.options);
    let { data: list } = await jo.list();
    jo.relax();

    // exlusions
    let exclude = [];
    if (action.origin.options.exclude) {
      for (let filespec of action.origin.options.exclude) {
        let rx = '^' + filespec + '$';
        rx = rx.replace('.', '\\.');
        rx = rx.replace('*', '.*');
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
      for (const subaction of action.actions) {
        retCode = await perform(subaction, replacements);
        if (retCode)
          break;
      }

      if (retCode)
        break;
    }

    /* could record some result logging
    if (action.terminal?.output) {
      logger.debug(JSON.stringify(<results>, null, " "));
      retCode = output(action.terminal.output, <results>);
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
