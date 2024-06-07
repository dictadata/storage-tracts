/**
 * storage/etl/list
 */
"use strict";

const Storage = require('../storage');
const { logger } = require('@dictadata/lib');
const { output } = require('@dictadata/lib/test');;

/**
 *
 */
module.exports = exports = async (fiber) => {
  logger.verbose("list ...");
  let retCode = 0;

  try {
    let origin = fiber.origin || {};
    var j1 = await Storage.activate(origin.smt, origin.options);

    let { data: list } = await j1.list();

    logger.verbose(JSON.stringify(list, null, " "));
    if (fiber.terminal?.output) {
      retCode = output(fiber.terminal.output, list, fiber.terminal.compareValues || 1);
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
