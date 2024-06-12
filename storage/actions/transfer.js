/**
 * storage/etl/transfer
 *
 * stream data from origin to terminal
 *
 */
"use strict";

const Storage = require('../storage');
const { StorageError } = require('@dictadata/storage-junctions/types');
const { logger } = require('@dictadata/lib');
const { objCopy } = require('@dictadata/lib');
const { output } = require('@dictadata/lib/test');;
const codify = require('./codify');

const { pipeline } = require('node:stream/promises');

/**
 * transfer action
 */
module.exports = exports = async (fiber) => {
  logger.info("=== transfer");
  let retCode = 0;

  // resolve urn
  if (typeof fiber?.urn === "string") {
    let results = await Storage.tracts.recall(fiber.urn);
    fiber = results.data[ 0 ].fibers[ 0 ];
  }

  var origin = fiber.origin || {};
  var terminal = fiber.terminal || {};
  var transforms = fiber.transforms || [];
  if (!origin.options) origin.options = {};
  if (!terminal.options) terminal.options = {};

  var jo, jt;  // junctions origin, terminal
  try {
    // note, options.encoding files have been read by Actions.perform

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

    //if (!terminal.options?.encoding || transforms.length > 0) {
    if (terminal.options?.codify) {
      // run some objects through transforms to create terminal encoding
      let codifyFiber = objCopy({}, fiber);
      codifyFiber.action = "codify";
      codifyFiber.terminal = {};

      let codifyEncoding = {};
      await codify(codifyFiber, codifyEncoding);
      terminal.options.encoding = codifyEncoding;
    }

    if (typeof terminal.options.encoding !== "object")
      throw new StorageError(400, "invalid terminal encoding");

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
    if (jt) {
      if (Object.hasOwn(jt.options, "autoClose") ? jt.options.autoClose : true)
        await jt.relax();
    }
  }

  return retCode;
};
