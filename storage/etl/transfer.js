/**
 * storage/etl/transfer
 *
 * stream data from datastore to datastore
 *
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const { logger } = require("@dictadata/storage-junctions/utils");
const output = require('./output');

const fs = require('fs');
const stream = require('stream').promises;

/**
 * transfer action
 */
module.exports = async (tract) => {
  logger.info("=== transfer");
  let retCode = 0;

  var origin = tract.origin || {};
  var terminal = tract.terminal || {};
  var transforms = tract.transform || tract.transforms || {};
  if (!origin.options) origin.options = {};
  if (!terminal.options) terminal.options = {};

  var jo, jt;  // junctions origin, terminal
  try {
    // check if origin encoding is in a file
    if (origin.options && typeof origin.options.encoding === "string") {
      let filename = origin.options.encoding;
      origin.options.encoding = JSON.parse(fs.readFileSync(filename, "utf8"));
    }

    // create origin junction
    logger.verbose(">>> create origin junction " + JSON.stringify(origin.smt, null, 2));
    jo = await Storage.activate(origin.smt, origin.options);

    /// get origin encoding
    logger.debug(">>> get origin encoding");
    let encoding = origin.options.encoding;
    if (!encoding && jo.capabilities.encoding) {
      let results = await jo.getEncoding();  // load encoding from origin for validation
      encoding = results.data[ "encoding" ];
    }

    /// determine terminal encoding
    logger.verbose(">>> determine terminal encoding");
    if (terminal.options && typeof terminal.options.encoding === "string") {
      // read encoding from file
      let filename = terminal.options.encoding;
      terminal.options.encoding = JSON.parse(fs.readFileSync(filename, "utf8"));
    }
    else if (!encoding || Object.keys(transforms).length > 0) {
      // otherwise run some objects through transforms to create terminal encoding
      logger.verbose(">>> codify pipeline");
      let pipes = [];

      let options = Object.assign({
        max_read: (origin.options && origin.options.max_read) || 100
      }, origin.pattern);

      let reader = jo.createReader(options);
      reader.on('error', (error) => {
        logger.error("transfer reader: " + error.message);
      });
      pipes.push(reader);

      for (let [ tfType, tfOptions ] of Object.entries(transforms))
        pipes.push(await jo.createTransform(tfType, tfOptions));

      let codify = await jo.createTransform('codify');
      pipes.push(codify);

      await stream.pipeline(pipes);
      terminal.options.encoding = codify.encoding;
    }
    else
      // use origin encoding
      terminal.options.encoding = encoding;

    if (typeof terminal.options.encoding !== "object")
      throw new Error("invalid terminal encoding");

    //logger.debug(">>> encoding results");
    //logger.debug(JSON.stringify(terminal.options.encoding.fields, null, " "));

    /// create terminal junction
    logger.verbose(">>> create terminal junction " + JSON.stringify(terminal.smt));
    jt = await Storage.activate(terminal.smt, terminal.options);

    logger.debug("create terminal schema");
    if (jt.capabilities.encoding && !terminal.options.append) {
      logger.verbose(">>> createSchema");
      let results = await jt.createSchema();
      if (results.resultCode !== 0)
        logger.info("could not create storage schema: " + results.resultMessage);
    }


    /// setup pipeline
    logger.verbose(">>> transfer pipeline");
    let pipes = [];

    // reader
    let options = Object.assign({}, origin.pattern);
    let reader = jo.createReader(options);
    reader.on('error', (error) => {
      logger.error("transfer reader: " + error.message);
    });
    pipes.push(reader);

    // transforms
    for (let [ tfName, tfOptions ] of Object.entries(transforms)) {
      let tfType = tfName.split("-")[ 0 ];
      pipes.push(await jo.createTransform(tfType, tfOptions));
    }

    // writer
    let writer = jt.createWriter();
    writer.on('error', (error) => {
      logger.error("transfer writer: " + error.message);
    });
    pipes.push(writer);

    // transfer data
    logger.verbose(">>> start transfer");
    await stream.pipeline(pipes);

    // if testing, validate results
    if (terminal.output) {
      retCode = output(terminal.output, null, false, terminal.compareValues || 2);
    }
    logger.info("=== completed");
  }
  catch (err) {
    logger.error("transfer: " + err.message);
    retCode = 1;
  }
  finally {
    if (jo)
      await jo.relax();
    if (jt)
      await jt.relax();
  }

  return retCode;
};
