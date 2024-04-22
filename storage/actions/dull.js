/**
 * storage/etl/dull
 */
"use strict";

const Storage = require("../storage");
const { logger, output } = require('../utils');

/**
 *
 */
module.exports = exports = async (fiber) => {
  logger.verbose("dull ...");
  let retCode = 0;

  try {
    let origin = fiber.origin || {};
    var j1 = await Storage.activate(origin.smt, origin.options);

    let results;
    results = await j1.dull(origin.pattern);

    if (fiber.terminal?.output) {
      retCode = output(fiber.terminal.output, results, fiber.terminal.compareValues);
    }
    //else {
    //  console.log(JSON.stringify(results, null, " "));
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
