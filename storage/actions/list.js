/**
 * storage/etl/list
 */
"use strict";

const Storage = require("../storage");
const { logger, output } = require('../utils');

/**
 *
 */
module.exports = async (action) => {
  logger.verbose("list ...");
  let retCode = 0;

  try {
    let origin = action.origin || {};
    var j1 = await Storage.activate(origin.smt, origin.options);

    let { data: list } = await j1.list();

    logger.verbose(JSON.stringify(list, null, " "));
    if (action.terminal?.output) {
      retCode = output(action.terminal.output, list, action.terminal.compareValues || 1);
    }
    //else {
    //  console.log(JSON.stringify(list, null, " "));
    //}

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
