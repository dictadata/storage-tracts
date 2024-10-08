/**
 * storage/etl/codify
 *
 * Create an engram from source data.
 * Output to a file.
 */
"use strict";

const Storage = require('../storage');
const { Field } = require('@dictadata/storage-junctions/types');
const { logger } = require('@dictadata/lib');
const { objCopy, typeOf } = require('@dictadata/lib');
const { output } = require('@dictadata/lib/test');

const { readFile } = require('node:fs/promises');
const { pipeline } = require('node:stream/promises');

const engrams_encoding = require('../engrams/engrams.engram.json');

/**
 * Create an engram from source data.
 *
 * @param {Object} fiber
 * @param {Object} fiber.source
 * @param {Object} fiber.transforms
 * @param {Object} fiber.terminal
 * @param {*} resultEncoding storage engram|encoding
 * @returns write resulting engram to fiber.terminal.output
 */
module.exports = exports = async function codify(fiber, resultEncoding) {
  logger.verbose("codify ...");
  let retCode = 0;

  var origin = fiber.origin || {};
  var terminal = fiber.terminal || {};
  var transforms = fiber.transforms || [];
  if (!origin.options) origin.options = {};
  if (!terminal.options) terminal.options = {};

  var jo, jt;
  try {
    // note, if origin.options.encoding is a string filename it will have been read by actions.js
    logger.debug(">>> origin junction " + JSON.stringify(origin.smt, null, 2));
    jo = await Storage.activate(origin.smt, origin.options);
    // note, if jo.capabilities.encoding is true origin.options.encoding will be set by the junction

    ///// prime the encoding
    if (Object.hasOwn(fiber, "encoding")) {
      if (typeof fiber.encoding === "string") {
        let filename = fiber.encoding;
        try {
          fiber.encoding = JSON.parse(await readFile(filename, "utf8"));
        }
        catch (err) {
          delete fiber.encoding;
          logger.warn(err.message);
        }
      }
    }
    else if (Object.hasOwn(origin.options, "encoding") && !transforms.length) {
      fiber.encoding = origin.options.encoding;
    }

    ///// run data through transforms (optional) and codify transform
    let pipes = [];

    let options = Object.assign({ count: 100 }, origin.options);

    let reader = jo.createReader(options);

    reader.on('error', (error) => {
      logger.error("codify reader: " + error.message);
    });

    pipes.push(reader);

    for (let transform of transforms)
      pipes.push(await Storage.activateTransform(transform.transform, transform));

    let ct = await Storage.activateTransform("codify", fiber);
    pipes.push(ct);

    if (terminal.smt) {
      if (!terminal.options.encoding)
        terminal.options.encoding = engrams_encoding;

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
      // logger.error("transfer writer: " + error.message);
      //});
      pipes.push(writer);
    }

    await pipeline(pipes);
    let encoding = ct.encoding;
    encoding.name = fiber.name || jo.engram.name || jo.smt.schema;
    encoding.smt = jo.smt;

    ///// output the results

    // modify the results, not common
    if (origin.options?.encoding_format === "types_only") {
      // replace field property with just storage type
      for (let [ name, field ] of Object.entries(encoding.fields)) {
        encoding.fields[ name ] = field.type;
      }
    }
    else if (origin.options?.encoding_format !== "all") {
      // replace field property with object containing non-default properties
      let _default = new Field("_default_");
      for (let [ fname, field ] of Object.entries(encoding.fields)) {
        for (let [ pname, value ] of Object.entries(field)) {
          if (Object.hasOwn(_default, pname) && value === _default[ pname ])
            delete field[ pname ];
        }
      }
    }

    //logger.verbose(JSON.stringify(encoding, null, " "));
    logger.debug(JSON.stringify(encoding.fields, null, " "));

    if (terminal.output) {
      retCode = output(terminal.output, encoding, terminal.compareValues);
    }
    //else if (!terminal?.smt) {
    //  console.log(JSON.stringify(encoding, null, " "));
    //}

    if (typeOf(resultEncoding) === "object")
      objCopy(resultEncoding, encoding);
  }
  catch (err) {
    logger.error(err);
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
