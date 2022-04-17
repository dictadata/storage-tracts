/**
 * etl/scan
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const { SMT } = require("@dictadata/storage-junctions/types");
const logger = require('./logger');
const { performAction } = require('./actions');

/**
 * List schemas at a locus
 * and perform an action on each schema.
 */
module.exports = async (tract) => {
  logger.verbose("scan: " + tract.origin.smt);
  let retCode = 0;

  var jo;
  try {
    // find tract(s) for loop processing
    // any tracts with key names that aren't reserved
    let lpTracts = {};
    for (const [ key, value ] of Object.entries(tract)) {
      if (key[ 0 ] !== "_" &&
        ![ "action", "origin", "terminal", "transform" ].includes(key)) {
        lpTracts[ key ] = value;
      }
    }

    // get list of schemas from source
    if (!tract.origin.options) tract.origin.options = {};
    jo = await Storage.activate(tract.origin.smt, tract.origin.options);
    let { data: list } = await jo.list();
    jo.relax();

    // loop through list and process each schema
    for (let entry of list) {
      logger.verbose(entry.name);

      for (const [ key, lpTract ] of Object.entries(lpTracts)) {
        // replace the schema in origin.smt
        if (typeof lpTract.origin.smt === "string")
          lpTract.origin.smt = new SMT(lpTract.origin.smt);
        lpTract.origin.smt.schema = entry.name;

        // replace the schema in terminal.smt
        if (tract.origin.options.terminal_smt) {
          if (typeof lpTract.terminal.smt === "string")
            lpTract.terminal.smt = new SMT(lpTract.terminal.smt);
          lpTract.terminal.smt.schema = entry.name;
        }

        // string replacement terminal.output
        if (lpTract.terminal.output) {
          lpTract.terminal.output = lpTract.terminal.output.replace("${schema}", entry.name);
        }

        await performAction(key, lpTract);
      }
    }

    if (tract.terminal && tract.terminal.output) {
      //logger.debug(JSON.stringify(<results>, null, " "));
      //logger.info("results saved to " + tract.terminal.output);
      //fs.mkdirSync(path.dirname(tract.terminal.output), { recursive: true });
      //fs.writeFileSync(tract.terminal.output, JSON.stringify(<results>, null, " "));
    }
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }
  finally {
    if (jo) await jo.relax();
  }

  return retCode;
};
