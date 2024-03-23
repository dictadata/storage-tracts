/**
 * storage/etl/transfer
 *
 * stream data from origin to terminal
 *
 */
"use strict";

const Storage = require("../storage");
const { objCopy } = require('@dictadata/storage-junctions/utils');
const { logger, output } = require('../utils');
const codify = require('./codify');

const { pipeline } = require('node:stream/promises');

/**
 * transfer action
 */
module.exports = async (action) => {
  logger.info("=== transfer");
  let retCode = 0;

  // resolve urn
  if (typeof action?.urn === "string") {
    let results = await Storage.tracts.recall(action.urn);
    action = results.data[ 0 ].actions[ 0 ];
  }

  var origin = action.origin || {};
  var terminal = action.terminal || {};
  var transforms = action.transforms || [];
  if (!origin.options) origin.options = {};
  if (!terminal.options) terminal.options = {};

  let autoClose = Object.hasOwn(terminal.options, "autoClose") ? terminal.options.autoClose : true;

  var jo, jt;  // junctions origin, terminal
  try {
    // note, options.encoding files have been read by actions.js

    // resolve the origin and terminal
    origin.smt = await Storage.resolve(origin.smt, origin.options);
    terminal.smt = await Storage.resolve(terminal.smt, terminal.options);

    // create origin junction
    logger.verbose(">>> create origin junction " + JSON.stringify(origin.smt, null, 2));
    jo = await Storage.activate(origin.smt, origin.options);
    // note, if jo.capabilities.encoding is true origin.options.encoding will be set by the junction

    if (!terminal.options?.encoding) {
      terminal.options.encoding = origin.options.encoding;
    }

    if (!terminal.options?.encoding || transforms.length > 0) {
      // run some objects through transforms to create terminal encoding
      let codifyAction = objCopy({}, action);
      codifyAction.action = "codify";
      codifyAction.terminal = {};

      let codifyEncoding = {};
      await codify(codifyAction, codifyEncoding);
      terminal.options.encoding = codifyEncoding;
    }

    if (typeof terminal.options.encoding !== "object")
      throw new Error("invalid terminal encoding");

    //logger.debug(">>> encoding results");
    //logger.debug(JSON.stringify(terminal.options.encoding.fields, null, " "));

    /// setup pipeline
    logger.verbose(">>> transfer pipeline");
    let pipes = [];

    // reader
    let reader = jo.createReader({ pattern: origin.pattern });
    //reader.on('error', (error) => {
    //  logger.error("transfer reader: " + error.message);
    //});
    pipes.push(reader);

    // transforms
    for (let transform of transforms) {
      pipes.push(await jo.createTransform(transform.transform, transform));
    }

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

    // writer
    let writer = jt.createWriter();
    //writer.on('error', (error) => {
    // logger.error("transfer writer: " + error.message);
    //});
    pipes.push(writer);

    // transfer data
    logger.verbose(">>> start transfer");
    await pipeline(pipes);

    // if testing, validate results
    if (terminal?.output) {
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
    if (jt && autoClose)
      await jt.relax();
  }

  return retCode;
};
