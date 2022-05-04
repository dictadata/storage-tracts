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
  logger.info("=== scan");
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

    // get list of schemas from source
    if (!tract.origin.options)
      tract.origin.options = {};
    jo = await Storage.activate(tract.origin.smt, tract.origin.options);
    let { data: list } = await jo.list();
    jo.relax();

    // exlusions
    let exclude = [];
    if (tract.origin.options.exclude) {
      for (let filespec of tract.origin.options.exclude) {
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
        "${rpath}": entry.rpath || entry.name,
        "${name}": entry.name,
        "${schema}": entry.name.substr(0, entry.name.lastIndexOf("."))
      };

      // loop thru tracts to process
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
      logger.info("results saved to " + tract.terminal.output);
      fs.mkdirSync(path.dirname(tract.terminal.output), { recursive: true });
      fs.writeFileSync(tract.terminal.output, JSON.stringify(<results>, null, " "));
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
