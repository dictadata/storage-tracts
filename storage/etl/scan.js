/**
 * etl/scan
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const { SMT } = require("@dictadata/storage-junctions/types");
const { _merge } = require('./config');
const logger = require('./logger');
const { performAction } = require('./actions');

/**
 * List schemas at a locus
 * and perform action(s) on each schema.
 */
module.exports = async (tract) => {
  logger.verbose("scan: " + tract.origin.smt);
  let retCode = 0;

  var jo;
  try {
    // validate tract(s) for loop processing
    // tracts with key names that aren't reserved
    let lpTracts = {};
    for (const [ key, value ] of Object.entries(tract)) {
      if (![ "action", "origin", "terminal", "transform", "description" ].includes(key) &&
        key[ 0 ] !== "_" &&
        typeof value === "object" && value.origin) {
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

      let replacements = {
        "${rpath}": entry.rpath || entry.name,
        "${name}": entry.name,
        "${schema}": entry.name.substr(0, entry.name.lastIndexOf("."))
      };

      for (const [ key, lpTract ] of Object.entries(lpTracts)) {
        let actTract = _merge({}, lpTract);

        // string replacements
        for (const [ find, replace ] of Object.entries(replacements)) {
          // replace strings in origin smt
          if (typeof actTract.origin.smt === "string") {
            actTract.origin.smt = actTract.origin.smt.replace(find, replace);
          }
          else if (typeof actTract.origin.smt === "object") {
            actTract.origin.smt.locus = actTract.origin.smt.locus.replace(find, replace);
            actTract.origin.smt.schema = actTract.origin.smt.schema.replace(find, replace);
          }

          // replace strings in terminal.smt
          if (typeof actTract.terminal.smt === "string") {
            actTract.terminal.smt = actTract.terminal.smt.replace(find, replace);
          }
          else if (typeof actTract.terminal.smt === "object") {
            actTract.terminal.smt.locus = actTract.terminal.smt.locus.replace(find, replace);
            actTract.terminal.smt.schema = actTract.terminal.smt.schema.replace(find, replace);
          }

          // replace strings in terminal.output
          if (actTract.terminal.output) {
            actTract.terminal.output = actTract.terminal.output.replace(find, replace);
          }
        }

        await performAction(key, actTract);
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
