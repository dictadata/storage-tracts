/**
 * storage/etl/transfer
 *
 * stream data from datastore to datastore
 *
 */
"use strict";

const Storage = require("../storage");
const { logger } = require('../utils');
const output = require('./output');

const fs = require('fs');
const stream = require('stream').promises;

/**
 * transfer action
 */
module.exports = async (action) => {
  logger.info("=== transfer");
  let retCode = 0;

  // resolve urn
  if (typeof action?.urn === "string") {
    let results = await Storage.tracts.recall(action.urn);
    action = results.data[ action.urn ].actions[0];
  }

  var origin = action.origin || {};
  var terminal = action.terminal || {};
  var transforms = action.transforms || [];
  if (!origin.options) origin.options = {};
  if (!terminal.options) terminal.options = {};

  var jo, jt;  // junctions origin, terminal
  try {
    // note, at this point file encodings have been read by actions.js

    // create origin junction
    logger.verbose(">>> create origin junction " + JSON.stringify(origin.smt, null, 2));
    jo = await Storage.activate(origin.smt, origin.options);

    /// get origin encoding
    logger.debug(">>> get origin encoding");
    let encoding = origin.options.encoding;
    if (!encoding && jo.capabilities.encoding) {
      let results = await jo.getEncoding();  // load encoding from origin for validation
      if (results.type === "encoding")
        encoding = results.data;
    }

    /// determine terminal encoding
    logger.verbose(">>> determine terminal encoding");
    if (terminal.options.encoding) {
      // do nothing
    }
    else if (!encoding || transforms.length > 0) {
      // run some objects through transforms to create terminal encoding
      logger.verbose(">>> codify pipeline");
      let pipes = [];

      let options = Object.assign({
        max_read: origin.options?.max_read || 100,
        pattern: origin.pattern
      });

      let reader = jo.createReader(options);
      reader.on('error', (error) => {
        logger.error("transfer reader: " + error.message);
      });
      pipes.push(reader);

      for (let tfOptions of transforms)
        pipes.push(await jo.createTransform(tfOptions.transform, tfOptions));

      let codify = await jo.createTransform('codify');
      pipes.push(codify);

      await stream.pipeline(pipes);
      terminal.options.encoding = codify.encoding;
    }
    else {
      // use origin encoding
      terminal.options.encoding = encoding;
    }

    if (typeof terminal.options.encoding !== "object")
      throw new Error("invalid terminal encoding");

    //logger.debug(">>> encoding results");
    //logger.debug(JSON.stringify(terminal.options.engram.fields, null, " "));

    /// create terminal junction
    logger.verbose(">>> create terminal junction " + JSON.stringify(terminal.smt));
    jt = await Storage.activate(terminal.smt, terminal.options);

    logger.debug("create terminal schema");
    if (jt.capabilities.encoding && !terminal.options.append) {
      logger.verbose(">>> createSchema");
      let results = await jt.createSchema();
      if (results.status !== 0)
        logger.info("could not create storage schema: " + results.message);
    }


    /// setup pipeline
    logger.verbose(">>> transfer pipeline");
    let pipes = [];

    // reader
    let reader = jo.createReader({ pattern: origin.pattern });
    // reader.on('error', (error) => {
    //   logger.error("transfer reader: " + error.message);
    // });
    pipes.push(reader);

    // transforms
    for (let tfOptions of transforms) {
      let tfType = tfOptions.transform.split("-")[ 0 ];
      pipes.push(await jo.createTransform(tfType, tfOptions));
    }

    // writer
    let writer = jt.createWriter();
    // writer.on('error', (error) => {
    //   logger.error("transfer writer: " + error.message);
    //   retCode = 1;
    // });
    pipes.push(writer);

    // transfer data
    logger.verbose(">>> start transfer");
    await stream.pipeline(pipes);

    // if testing, validate results
    if (terminal.output) {
      retCode = output(terminal.output, null, terminal.compareValues || 2);
    }
    logger.info("=== completed");
  }
  catch (err) {
    logger.error("transfer: " + err.message + " " + err.stack);
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
