/**
 * storage/etl/codify
 */
"use strict";

const Storage = require("../storage");
const { Field } = require('@dictadata/storage-junctions/types');
const { logger } = require('../utils');
const output = require('./output');
const fs = require('fs');
const stream = require('stream').promises;

/**
 *
 */
module.exports = async (action) => {
  logger.verbose("codify ...");
  let retCode = 0;

  var jo;
  try {
    let origin = action.origin || {};
    if (!Object.hasOwn(origin, "options"))
      origin.options = {};
    let transforms = action.transforms || [];

    jo = await Storage.activate(origin.smt, origin.options);

    let encoding = {};
    // if not a filesystem based source and no transforms defined
    // then get source encoding
    if (jo.capabilities.encoding && !transforms.length) {
      let results = await jo.getEngram();
      if (results.type === "engram")
        encoding = results.data;
    }
    else {
      // if filesystem based source or transforms defined
      // then run some data through the codifier
      let pipes = [];

      if (typeof action.encoding === "string") {
        let filename = action.encoding;
        action.encoding = JSON.parse(fs.readFileSync(filename, "utf8"));
      }

      let options = { max_read: origin.options.max_read || 100, pattern: origin.pattern };
      let reader = jo.createReader(options);
      reader.on('error', (error) => {
        logger.error("codify reader: " + error.message);
      });
      pipes.push(reader);

      for (let transform of transforms)
        pipes.push(await jo.createTransform(transform.transform, transform));

      let ct = await jo.createTransform("codify", action);
      pipes.push(ct);

      await stream.pipeline(pipes);
      encoding = ct.encoding;
    }

    if (origin.options.encoding_format === "types_only") {
      // replace field property with storage type (string)
      for (let [ name, field ] of Object.entries(encoding.fields)) {
        encoding.fields[ name ] = field.type;
      }
    }
    else if (origin.options.encoding_format !== "all") {
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
    if (action.terminal?.output) {
      retCode = output(action.terminal.output, encoding, 1);
    }
    else {
      console.log(JSON.stringify(encoding, null, " "));
    }

  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }
  finally {
    await jo.relax();
  }

  return retCode;
};
