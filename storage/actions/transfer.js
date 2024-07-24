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

const { finished } = require('node:stream/promises');

/**
 * transfer action
 */
module.exports = exports = async (fiber) => {
  logger.verbose("=== transfer");
  let retCode = 0;

  // resolve urn
  if (typeof fiber?.urn === "string") {
    let results = await Storage.tracts.recall(fiber.urn);
    fiber = results.data[ 0 ].fibers[ 0 ];
  }

  var origin = fiber.origin;
  if (!origin.options) origin.options = {};
  var transforms = fiber.transforms || [];

  let terminals = Array.isArray(fiber.terminal) ? fiber.terminal : [ fiber.terminal ];
  for (let terminal of terminals)
    if (!terminal.options) terminal.options = {};

  var jo;       // junction origin
  var jts = [];  // junction terminal(s)
  try {
    // note, options.encoding files have been read by Actions.perform

    // resolve the origin and terminal
    origin.smt = await Storage.resolve(origin.smt, origin.options);
    for (let terminal of terminals)
      terminal.smt = await Storage.resolve(terminal.smt, terminal.options);

    // origin junction
    logger.debug(">>> origin junction " + JSON.stringify(origin.smt, null, 2));
    jo = await Storage.activate(origin.smt, origin.options);
    // note, if jo.capabilities.encoding is true origin.options.encoding will be set by the junction

    for (let terminal of terminals)
      if (!terminal.options?.encoding)
        terminal.options.encoding = origin.options.encoding;

    //if (!origin.options?.encoding || transforms.length > 0) {
    if (origin.options?.codify) {
      // run some objects through transforms to terminal encoding
      let codifyFiber = objCopy({}, fiber);
      codifyFiber.action = "codify";
      codifyFiber.terminal = {};

      let codifyEncoding = {};
      await codify(codifyFiber, codifyEncoding);
      for (let terminal of terminals)
        terminal.options.encoding = codifyEncoding;
    }

    for (let terminal of terminals) {
      //if (typeof terminal.options.encoding !== "object")
      //  throw new StorageError(400, "invalid terminal encoding");
    }

    //logger.debug(">>> encoding results");
    //logger.debug(JSON.stringify(terminal.options.encoding.fields, null, " "));

    /// setup pipeline
    logger.debug(">>> transfer pipeline");

    // reader
    let reader = jo.createReader({ pattern: origin.pattern });
    //reader.on('error', (error) => {
    //  logger.error("transfer reader: " + error.message);
    //});
    let pipeline = reader;

    // transforms
    for (let transform of transforms) {
      transform._junction = jo;
      pipeline = pipeline.pipe(await Storage.activateTransform(transform.transform, transform));
    }

    /// terminal junction(s)
    let writers = [];
    for (let terminal of terminals) {
      logger.debug(">>> terminal junction " + JSON.stringify(terminal.smt));
      let jt = await Storage.activate(terminal.smt, terminal.options);
      jts.push(jt);

      logger.debug("terminal schema");
      if (jt.capabilities.encoding && !terminal.options?.append) {
        logger.debug(">>> createSchema");
        let results = await jt.createSchema();
        if (results.status !== 0)
          logger.info("could not create storage schema: " + results.message);
      }

      // writer
      let writer = jt.createWriter();
      //writer.on('error', (error) => {
      // logger.error("transfer writer: " + error.message);
      //});
      writers.push(writer);
      pipeline.pipe(writer);
    }

    // transfer data
    logger.debug(">>> await transfer");
    await finished(reader);
    for (let writer of writers)
      await finished(writer);

    // if testing, validate results
    for (let terminal of terminals) {
      if (terminal?.output) {
        retCode |= output(terminal.output, null, terminal.compareValues);
      }
    }

    logger.verbose("=== completed");

    let stats = writers[0]._stats;
    logger.info(stats.count + " in " + stats.elapsed / 1000 + "s, " + Math.round(stats.count / (stats.elapsed / 1000)) + "/sec");
  }
  catch (err) {
    logger.error("transfer: " + err.message + " " + err.stack);
    retCode = 1;
  }
  finally {
    if (jo)
      await jo.relax();
    for (let jt of jts)
      if (jt && (Object.hasOwn(jt.options, "autoClose") ? jt.options.autoClose : true))
        await jt.relax();
  }

  return retCode;
};
