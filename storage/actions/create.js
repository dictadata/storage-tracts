/**
 * storage/etl/create
 */
"use strict";

const Storage = require("../storage");
const { logger, output } = require('../utils');

/**
 *
 */
module.exports = async (action) => {
  logger.verbose("create ...");
  let retCode = 0;

  try {
    let origin = action.origin || {};
    var j1 = await Storage.activate(origin.smt, origin.options);

    let results = await j1.createSchema();

    if (action.terminal?.output) {
      retCode = output(action.terminal.output, results, action.terminal.compareValues);
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
