/**
 * storage/etl/codify
 */
"use strict";

const Storage = require("../storage");
const { Field } = require('@dictadata/storage-junctions/types');
const { objCopy, typeOf } = require('@dictadata/storage-junctions/utils');
const { logger } = require('../utils');
const output = require('./output');
const fs = require('node:fs');
const stream = require('node:stream').promises;

const engrams_encoding = require("../engrams/engrams.engram.json");

/**
 *
 */
module.exports = async (action, resultEncoding) => {
  logger.verbose("codify ...");
  let retCode = 0;

  var origin = action.origin || {};
  var terminal = action.terminal || {};
  var transforms = action.transforms || [];
  if (!origin.options) origin.options = {};
  if (!terminal.options) terminal.options = {};

  var jo, jt;
  try {
    // note, if origin.options.encoding is a string filename it will have been read by actions.js
    logger.verbose(">>> create origin junction " + JSON.stringify(origin.smt, null, 2));
    jo = await Storage.activate(origin.smt, origin.options);
    // note, if jo.capabilities.encoding is true origin.options.encoding will be set by the junction

    ///// prime the encoding
    if (Object.hasOwn(action, "encoding")) {
      if (typeof action.encoding === "string") {
        let filename = action.encoding;
        action.encoding = JSON.parse(fs.readFileSync(filename, "utf8"));
      }
    }
    else if (Object.hasOwn(origin.options, "encoding") && !transforms.length) {
      action.encoding = origin.options.encoding;
    }

    ///// run data through transforms (optional) and codify transform
    let pipes = [];

    let options = {
      max_read: origin.options.max_read || 100
    };

    let reader = jo.createReader(options);

    reader.on('error', (error) => {
      logger.error("codify reader: " + error.message);
    });

    pipes.push(reader);

    for (let transform of transforms)
      pipes.push(await jo.createTransform(transform.transform, transform));

    let ct = await jo.createTransform("codify", action);
    pipes.push(ct);

    if (terminal.smt) {
      if (!terminal.options.encoding)
        terminal.options.encoding = engrams_encoding;

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
    }

    await stream.pipeline(pipes);
    let encoding = ct.encoding;

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
      retCode = output(terminal.output, encoding, terminal.compareValues || 1);
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
