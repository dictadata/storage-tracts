/**
 * storage/etl/iterate
 */
"use strict";

const Storage = require("../storage");
const { SMT } = require("@dictadata/storage-junctions/types")
const { logger } = require('../utils');
const { typeOf, objCopy } = require('@dictadata/storage-junctions/utils');
const { perform } = require('./');
const output = require('./output');

/**
 * Retrieve data from origin smt
 * and perform action(s) on each construct.
 */
module.exports = async (action) => {
  logger.info("=== iterate");
  logger.verbose(action.origin.smt);
  let retCode = 0;

  var jo;
  var jt;
  var writer;
  var results_separator;
  try {
    if (!action.origin.options)
      action.origin.options = {};
    jo = await Storage.activate(action.origin.smt, action.origin.options);

    if (action.terminal) {
      if (!action.terminal.options)
        action.terminal.options = {};
      jt = await Storage.activate(action.terminal.smt, action.terminal.options);
      writer = jt.createWriter();
      results_separator = action.terminal.options.results_separator;
    }

    // get constructs from source
    let { data: list } = await jo.retrieve(action.origin.pattern);
    jo.relax();

    if (typeOf(list) === "object")
      list = Object.values(list);

    // loop through list and process each schema
    let separator;
    for (let entry of list) {

      // loop thru sub actions
      for (const sub of action.actions) {
        let subaction = objCopy({}, sub);

        if (subaction.terminal?.smt === "$:smt" && jt) {
          if (jt.capabilities.filesystem) {
            subaction.terminal.smt = Object.assign({}, jt.smt,
              {
                locus: "stream:*"
              });
            subaction.terminal.options = Object.assign({}, subaction.terminal.options,
              {
                writer: writer.ws,
                autoClose: false
              });

            if (!results_separator && jt.smt.model === "json")
              results_separator = ",";
          }
          else {
            subaction.terminal.smt = Object.assign({}, jt.smt);
            subaction.terminal.options = Object.assign({}, subaction.terminal.options,
              {
                junction: jt,
                autoClose: false
              });
          }
        }

        if (separator && writer)
          writer.ws.write(separator);

        await perform(subaction, entry);

        separator = results_separator;
      }
    }

    if (writer) {
      await new Promise((resolve) => {
        writer.end(resolve);
      });
    }

    if (action.terminal?.output) {
      retCode = output(action.terminal.output, null, 1);
    }

    logger.info("=== completed");
  }
  catch (err) {
    logger.error("iterate: " + err.message);
    retCode = 1;
  }
  finally {
    if (jo) await jo.relax();
    if (jt) await jt.relax();
  }

  return retCode;
};
