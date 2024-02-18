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
module.exports = async (action) => {
  logger.info("=== iterate");
  logger.verbose(action.origin.smt);
  let retCode = 0;

  var jo;
  try {
    // get constructs from source
    if (!action.origin.options)
      action.origin.options = {};
    jo = await Storage.activate(action.origin.smt, action.origin.options);
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

      // loop thru subactions
      for (const subaction of action.actions) {
        await perform(subaction, replacements);
      }
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
    logger.error("iterate: " + err.message);
    retCode = 1;
  }
  finally {
    if (jo) await jo.relax();
  }

  return retCode;
};
