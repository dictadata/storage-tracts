/**
 * storage/etl/iterate
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const output = require('./output');
const logger = require('./logger');
const { performAction } = require('./actions');

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
    // validate sub-tract(s) for loop processing
    // looking for tracts with names (key) that aren't reserved
    let lpTracts = {};
    for (const [ key, value ] of Object.entries(tract)) {
      if (![ "action", "origin", "terminal", "transform", "description" ].includes(key) &&
        key[ 0 ] !== "_" &&
        typeof value === "object" && value.origin) {
        lpTracts[ key ] = value;
      }
    }

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
      for (let [ name, value ] of Object.entries(entry))
        replacements[ "${" + name + "}" ] = value;

      // loop thru tracts to process replacements
      for (const [ key, lpTract ] of Object.entries(lpTracts)) {
        // string replacements
        let txtTract = JSON.stringify(lpTract);
        for (const [ find, replace ] of Object.entries(replacements)) {
          txtTract = txtTract.replace(find, replace);
        }

        // perform action
        let actTract = JSON.parse(txtTract);
        await performAction(key, actTract);
      }
    }

    /* could record some result logging
    if (tract.terminal && tract.terminal.output) {
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
