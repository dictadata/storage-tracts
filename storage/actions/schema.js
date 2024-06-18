/**
 * storage/etl/create
 */
"use strict";

const Storage = require('../storage');
const { logger } = require('@dictadata/lib');
const { output } = require('@dictadata/lib/test');;
const { readFile } = require('node:fs/promises');

/**
 *
 */
module.exports = exports = async (fiber) => {
  logger.verbose("create ...");
  let retCode = 0;
  let jo;
  let results;

  try {
    let options = fiber.origin.options || {};
    if (typeof options.encoding === "string") {
        // read encoding from file
        let filename = options.encoding;
        let encoding = JSON.parse(await readFile(filename, "utf8"));
        options.encoding = encoding;
      }

    jo = await Storage.activate(fiber.origin.smt, options);

    switch (fiber.method) {
      case "create":
        results = await jo.createSchema();
        break;
      case "dull":
        results = await jo.dullSchema();
        break;
      case "encoding":
        results = await jo.getEngram();
        break;
    }

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
    if (jo)
      await jo.relax();
  }

  return retCode;
};
