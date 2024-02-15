/**
 * storage/etl/iterate
 */
"use strict";

const Storage = require("../storage");
const { logger } = require('../utils');
const { perform } = require('./');

/**
 * Retrieve data from origin smt
 * and perform action(s) on each construct.
 */
module.exports = async (tract) => {
  logger.info("=== iterate");
  logger.verbose(tract.origin.smt);
  let retCode = 0;

  var jo;
  try {
    // get constructs from source
    if (!tract.origin.options)
      tract.origin.options = {};
    jo = await Storage.activate(tract.origin.smt, tract.origin.options);
    let { data: list } = await jo.retrieve();
    jo.relax();

    // loop through list and process each schema
    for (let entry of list) {

      // check exclusion list
      // TBD

      // set string replacement values
      let replacements = {};
      for (let [ name, value ] of Object.entries(entry)) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
          replacements[ name ] = value;
      }

      // loop thru subtracts
      for (const subtract of tract.tracts) {
        await perform(subtract, replacements);
      }
    }

    /* could record some result logging
    if (tract.terminal?.output) {
      logger.debug(JSON.stringify(<results>, null, " "));
      retCode = output(tract.terminal.output, <results>);
    }
    */

    logger.info("=== completed");
  }
  catch (err) {
    logger.error("iterate: " + err.message);
    retCode = 1;
  }
  finally {
    if (jo) await jo.relax();
  }

  return retCode;
};
