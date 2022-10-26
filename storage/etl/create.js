/**
 * storage/etl/create
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const output = require('./output');
const logger = require('./logger');

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("dull ...");
  let retCode = 0;

  try {
    let origin = tract.origin || {};
    var j1 = await Storage.activate(origin.smt, origin.options);

    let results = await j1.createSchema();

    if (tract.terminal.output) {
      retCode = output(tract.terminal.output, results);
    }
    else {
      console.log(JSON.stringify(results, null, " "));
    }

  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }
  finally {
    await j1.relax();
  }

  return retCode;
};
