/**
 * storage/etl/retrieve
 *
 * retrieve data from origin to stream to terminal
 *
 */
"use strict";

const Storage = require('../storage');
const { StorageError } = require('@dictadata/storage-junctions/types');
const { logger } = require('@dictadata/lib');
const { objCopy, typeOf } = require('@dictadata/lib');
const { output } = require('@dictadata/lib/test');;
const codify = require('./codify');

const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

/**
 * retrieve action
 */
module.exports = exports = async (fiber) => {
  logger.verbose("=== retrieve");
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

  var jo, js, jt;  // junctions origin, source, terminal
  try {
    // note, options.encoding files have been read by Actions.perform

    // resolve the origin and terminal
    origin.smt = await Storage.resolve(origin.smt, origin.options);
    terminal.smt = await Storage.resolve(terminal.smt, terminal.options);

    // origin junction
    logger.debug(">>> origin junction " + JSON.stringify(origin.smt, null, 2));
    jo = await Storage.activate(origin.smt, origin.options);
    // note, if jo.capabilities.encoding is true origin.options.encoding will be set by the junction

    if (!terminal.options?.encoding) {
      terminal.options.encoding = origin.options.encoding;
    }

    //if (!terminal.options?.encoding || transforms.length > 0) {
    if (origin.options?.codify) {
      // run some objects through transforms to terminal encoding
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

    logger.debug(">>> retrieve data" );
    let results = await jo.retrieve(origin.pattern);
    let data = typeOf(results.data) === "object" ? Object.values(results.data) : (results.data || []);

    if (results.status === 404 && fiber.source_fiber) {
      return fiber.source_fiber;
    }

    if (results.status !== 0 && results.status !== 404)
      throw new StorageError(results.status, results.message);

    /// setup pipeline
    logger.debug(">>> retrieve pipeline");
    let pipes = [];

    // reader
    let reader = Readable.from(data);
    //reader.on('error', (error) => {
    //  logger.error("retrieve reader: " + error.message);
    //});
    pipes.push(reader);

    // transforms
    for (let transform of transforms) {
      pipes.push(await jo.createTransform(transform.transform, transform));
    }

    /// terminal junction
    logger.debug(">>> terminal junction " + JSON.stringify(terminal.smt));
    jt = await Storage.activate(terminal.smt, terminal.options);

    logger.debug("terminal schema");
    if (jt.capabilities.encoding && !terminal.options.append) {
      logger.debug(">>> createSchema");
      let results = await jt.createSchema();
      if (results.status !== 0)
        logger.info("could not create storage schema: " + results.message);
    }

    // writer
    let writer = jt.createWriter();
    //writer.on('error', (error) => {
    // logger.error("retrieve writer: " + error.message);
    //});
    pipes.push(writer);

    // transfer data
    logger.debug(">>> start transfer");
    await pipeline(pipes);

    // if testing, validate results
    if (terminal?.output) {
      retCode = output(terminal.output, null, terminal.compareValues || 2);
    }
    logger.verbose("=== completed");
  }
  catch (err) {
    logger.error("retrieve: " + err.message + " " + err.stack);
    retCode = 1;
  }
  finally {
    if (jo)
      await jo.relax();
    if (js)
      await js.relax();
    if (jt) {
      if (Object.hasOwn(jt.options, "autoClose") ? jt.options.autoClose : true)
        await jt.relax();
    }
  }

  return retCode;
};
