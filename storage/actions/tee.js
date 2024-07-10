/**
 * stor\ge/etl/tee
 *
 * stream data from origin to multiple terminals
 *
 * DEPRECATED use transfer action
 */
"use strict";

const Storage = require('../storage');
const { StorageError } = require('@dictadata/storage-junctions/types');
const { logger } = require('@dictadata/lib');
const { objCopy } = require('@dictadata/lib');
const { output } = require('@dictadata/lib/test');;
const codify = require('./codify');

const { readFile } = require('node:fs');
const { finished } = require('node:stream/promises');

/**
 * transfer w/ tee action
 */
module.exports = exports = async (fiber) => {
  logger.verbose("=== tee transfer");
  let retCode = 0;

  // resolve urn
  if (typeof fiber?.urn === "string") {
    let results = await Storage.tracts.recall(fiber.urn);
    fiber = results.data[ 0 ].fibers[ 0 ];
  }

  var origin = fiber.origin || {};
  var terminals = fiber.terminals || [];
  if (!fiber.transforms) fiber.transforms = [];
  if (!origin.options) origin.options = {};
  for (let terminal of terminals) {
    if (!terminal.options) terminal.options = {};
  }

  var jo;        // junction origin
  var jtl = [];  // junction terminal list
  try {
    // note, options.encoding files have been read by Actions.perform

    // resolve the origin and terminals
    origin.smt = await Storage.resolve(origin.smt, origin.options);
    for (let terminal of terminals) {
      terminal.smt = await Storage.resolve(terminal.smt, terminal.options);
    }

    // origin junction
    logger.debug(">>> origin junction " + JSON.stringify(origin.smt, null, 2));
    jo = await Storage.activate(origin.smt, origin.options);
    // note, if jo.capabilities.encoding is true origin.options.encoding will be set by the junction

    let codifyEncoding = {};
    for (let terminal of terminals) {

      if (!terminal.options?.encoding) {
        terminal.options.encoding = origin.options.encoding;
      }

      //if (!terminal.options?.encoding || transforms.length > 0) {
      if (origin.options?.codify) {
        // only codify once
        if (!codifyEncoding.name) {
          // run some objects through pipeline to terminal encoding
          let codifyFiber = objCopy({}, fiber);
          codifyFiber.action = "codify";
          codifyFiber.terminal = {};

          await codify(codifyFiber, codifyEncoding);
        }

        terminal.options.encoding = codifyEncoding;
      }

      if (typeof terminal.options.encoding !== "object")
        throw new StorageError(400, "invalid terminal encoding");
    }

    //logger.debug(">>> encoding results");
    //logger.debug(JSON.stringify(terminal.options.encoding.fields, null, " "));

    /// setup pipeline
    logger.debug(">>> transfer pipeline");
    let transforms = [];
    let writers = [];

    // reader
    let reader = jo.createReader({ pattern: origin.pattern });
    //reader.on('error', (error) => {
    //  logger.error("tee reader: " + error.message);
    //});

    // transforms
    for (let transform of fiber.transforms) {
      let tfType = transform.transform;
      transforms.push(await jo.createTransform(tfType, transform));
    }

    /// terminal junctions
    for (let terminal of terminals) {

      logger.debug(">>> terminal junction " + JSON.stringify(terminal.smt));
      let jt = await Storage.activate(terminal.smt, terminal.options);
      jtl.push(jt);

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
      // logger.error("tee writer: " + error.message);
      //});
      writers.push(writer);
    }

    // transfer data
    logger.debug(">>> start transfer");
    let pipe = reader;
    for (let transform of transforms)
      pipe = pipe.pipe(transform);
    for (let writer of writers)
      pipe.pipe(writer);

    await finished(reader);
    for (let writer of writers)
      await finished(writer);

    for (let terminal of terminals) {
      if (terminal?.output) {
        retCode = output(terminal.output, null, terminal.compareValues || 2);
      }
    }
    logger.verbose("=== completed");
  }
  catch (err) {
    logger.error("tee: " + err.message);
    retCode = 1;
  }
  finally {
    if (jo)
      await jo.relax();
    for (let jt of jtl) {
      if (jt) {
        if (Object.hasOwn(jt.options, "autoClose") ? jt.options.autoClose : true)
          await jt.relax();
      }
    }
  }

  return retCode;
};
