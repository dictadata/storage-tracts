/**
 * etl/codify
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const { Field } = require('@dictadata/storage-junctions/types');
const logger = require('./logger');

const fs = require('fs');
const path = require('path');
const stream = require('stream').promises;

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("codify ...");
  let retCode = 0;

  var jo;
  try {
    let origin = tract.origin || {};
    if (!Object.prototype.hasOwnProperty.call(origin, "options"))
      origin.options = {};
    let transforms = tract.transform || tract.transforms || {};

    jo = await Storage.activate(origin.smt, origin.options);

    let encoding = {};
    // if not a filesystem based source and no transforms defined
    // then get source encoding
    if (jo.capabilities.encoding && !transforms.length) {
      let results = await jo.getEncoding();
      encoding = results.data[ "encoding" ];
    }
    else {
      // if filesystem based source or transforms defined
      // then run some data through the codifier
      let pipes = [];

      let options = Object.assign({ max_read: 100 }, origin.pattern);
      let reader = jo.createReader(options);
      reader.on('error', (error) => {
        logger.error("codify reader: " + error.message);
      });
      pipes.push(reader);

      for (let [ tfType, tfOptions ] of Object.entries(transforms))
        pipes.push(await jo.createTransform(tfType, tfOptions));

      let ct = await jo.createTransform('codify');
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
          if (Object.prototype.hasOwnProperty.call(_default, pname) && value === _default[ pname ])
            delete field[ pname ];
        }
      }
    }

    //logger.verbose(JSON.stringify(encoding, null, " "));
    logger.debug(JSON.stringify(encoding.fields, null, " "));
    if (tract.terminal.output) {
      logger.info("encoding saved to " + tract.terminal.output);
      fs.mkdirSync(path.dirname(tract.terminal.output), { recursive: true });
      fs.writeFileSync(tract.terminal.output, JSON.stringify(encoding, null, " "));
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
