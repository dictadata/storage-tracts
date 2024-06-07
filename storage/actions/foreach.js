/**
 * storage/etl/foreach
 */
"use strict";

const Storage = require('../storage');
const { logger } = require('@dictadata/lib');
const { typeOf, objCopy } = require('@dictadata/lib/utils');
const { output } = require('@dictadata/lib/test');;
const { perform } = require('.');

/**
 * Retrieve data from origin smt
 * and perform action(s) on each construct.
 */
module.exports = exports = async (fiber) => {
  logger.info("=== foreach");
  logger.verbose(fiber.origin.smt);
  let retCode = 0;

  var jo;
  var jt;
  var writer;
  var results_separator;
  try {
    if (!fiber.origin.options)
      fiber.origin.options = {};
    jo = await Storage.activate(fiber.origin.smt, fiber.origin.options);

    if (fiber.terminal) {
      if (!fiber.terminal.options)
        fiber.terminal.options = {};
      jt = await Storage.activate(fiber.terminal.smt, fiber.terminal.options);
      writer = jt.createWriter();
      results_separator = fiber.terminal.options.results_separator;
    }

    // get constructs from source
    let { data: list } = await jo.retrieve(fiber.origin.pattern);
    jo.relax();

    if (typeOf(list) === "object")
      list = Object.values(list);

    // loop through list and process each schema
    let separator;
    for (let entry of list) {

      // loop thru sub fibers
      for (const sub of fiber.fibers) {
        let subfiber = objCopy({}, sub);

        if (subfiber.terminal?.smt === "$:smt" && jt) {
          if (jt.capabilities.filesystem) {
            subfiber.terminal.smt = Object.assign({}, jt.smt,
              {
                locus: "stream:*"
              });
            subfiber.terminal.options = Object.assign({}, subfiber.terminal.options,
              {
                writer: writer.ws,
                autoClose: false
              });

            if (!results_separator && jt.smt.model === "json")
              results_separator = ",";
          }
          else {
            subfiber.terminal.smt = Object.assign({}, jt.smt);
            subfiber.terminal.options = Object.assign({}, subfiber.terminal.options,
              {
                junction: jt,
                autoClose: false
              });
          }
        }

        if (separator && writer)
          writer.ws.write(separator);

        await perform(subfiber, entry);

        separator = results_separator;
      }
    }

    if (writer) {
      await new Promise((resolve) => {
        writer.end(resolve);
      });
    }

    if (fiber.terminal?.output) {
      retCode = output(fiber.terminal.output, null, fiber.terminal.compareValues || 1);
    }

    logger.info("=== completed");
  }
  catch (err) {
    logger.error("foreach: " + err.message);
    retCode = 1;
  }
  finally {
    if (jo) await jo.relax();
    if (jt) await jt.relax();
  }

  return retCode;
};
