/**
 * storage/etl/create
 */
"use strict";

const Storage = require("../storage");
const { logger, output } = require('../utils');

/**
 *
 */
module.exports = async (fiber) => {
  logger.verbose("create ...");
  let retCode = 0;

  try {
    let origin = fiber.origin || {};
    var j1 = await Storage.activate(origin.smt, origin.options);

    let results = await j1.createSchema();

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
