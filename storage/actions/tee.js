/**
 * storage/etl/tee
 *
 * stream data from origin to multiple terminals
 *
 */
"use strict";

const Storage = require("../storage");
const { objCopy } = require('@dictadata/storage-junctions/utils');
const { logger, output } = require('../utils');
const codify = require('./codify');

const fs = require('node:fs');
const { finished } = require('node:stream/promises');

/**
 * transfer w/ tee action
 */
module.exports = exports = async (fiber) => {
  logger.info("=== tee transfer");
  let retCode = 0;

  // resolve urn
  if (typeof fiber?.urn === "string") {
    let results = await Storage.tracts.recall(fiber.urn);
    fiber = results.data[ 0 ].fibers[ 0 ];
  }

  var origin = fiber.origin || {};
  var terminals = fiber.terminals || [];
  var transforms = fiber.transforms || [];
  if (!origin.options) origin.options = {};
  for (let terminal of terminals) {
    if (!terminal.options) terminal.options = {};
  }

  var jo;        // junction origin
  var jtl = [];  // junction terminal list
  try {
    // note, origin.options.encoding files have been read by actions.js

    // resolve the origin and terminals
    origin.smt = await Storage.resolve(origin.smt, origin.options);
    for (let terminal of terminals) {
      if (typeof terminal.options.encoding === "string") {
        let filename = terminal.options.encoding;
        terminal.options.encoding = JSON.parse(await fs.readFile(filename, "utf8"));
      }
      terminal.smt = await Storage.resolve(terminal.smt, terminal.options);
    }

    // create origin junction
    logger.verbose(">>> create origin junction " + JSON.stringify(origin.smt, null, 2));
    jo = await Storage.activate(origin.smt, origin.options);
    // note, if jo.capabilities.encoding is true origin.options.encoding will be set by the junction

    let codifyEncoding = {};
    for (let terminal of terminals) {
      if (!terminal.options?.encoding) {
        terminal.options.encoding = origin.options.encoding;
      }

      if (!terminal.options?.encoding || transforms.length > 0) {
        if (!codifyEncoding.name) {
          // run some objects through transforms to create terminal encoding
          let codifyFiber = objCopy({}, fiber);
          codifyFiber.action = "codify";
          codifyFiber.terminal = {};

          await codify(codifyFiber, codifyEncoding);
        }
        terminal.options.encoding = codifyEncoding;
      }

      if (typeof terminal.options.encoding !== "object")
        throw new Error("invalid terminal encoding");
    }

    //logger.debug(">>> encoding results");
    //logger.debug(JSON.stringify(terminal.options.encoding.fields, null, " "));

    /// setup pipeline
    logger.verbose(">>> transfer pipeline");
    let pipes = [];
    let writers = [];

    // reader
    let reader = jo.createReader({ pattern: origin.pattern });
    //reader.on('error', (error) => {
    //  logger.error("tee reader: " + error.message);
    //});
    pipes.push(reader);

    // transforms
    for (let transform of transforms) {
      let tfType = transform.transform;
      pipes.push(await jo.createTransform(tfType, transform));
    }

    /// create terminal junctions
    for (let terminal of terminals) {

      logger.verbose(">>> create terminal junction " + JSON.stringify(terminal.smt));
      let jt = await Storage.activate(terminal.smt, terminal.options);
      jtl.push(jt);

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
      // logger.error("tee writer: " + error.message);
      //});
      writers.push(writer);
    }

    // transfer data
    logger.verbose(">>> start transfer");
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
    logger.info("=== completed");
  }
  catch (err) {
    logger.error("tee: " + err.message);
    retCode = 1;
  }
  finally {
    if (jo)
      await jo.relax();
    for (let jt of jtl) {
      if (jt)
        await jt.relax();
    }
  }

  return retCode;
};
