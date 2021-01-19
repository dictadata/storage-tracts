/**
 * etl/codify
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const fs = require('fs/promises');
const stream = require('stream/promises');

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("codify ...");
  let retcode = 0;

  var jo;
  try {
    let origin = tract.origin || {};
    if (!Object.prototype.hasOwnProperty.call(origin, "options"))
      origin.options = {};
    let transforms = tract.transforms || {};

    jo = await storage.activate(origin.smt, origin.options);

    let encoding = {};
    // if not a filesystem based source and no transforms defined
    // then get source encoding
    if (!storage.FileSystems.isUsedBy(jo.engram.model) && !transforms.length) {
      encoding = await jo.getEncoding();
    }
    else {
      // if filesystem based source or transforms defined
      // then run some data through the codifier
      let pipes = [];
      pipes.push(jo.createReadStream(origin.options || { max_read: 100 }));

      for (let [tfType, options] of Object.entries(transforms))
        pipes.push(jo.createTransform(tfType, options));
    
      let ct = jo.createTransform('codify');
      pipes.push(ct);

      await stream.pipeline(pipes);
      encoding = await ct.getEncoding();
    }

    if (origin.options.encoding_format === "short") {
      for (let [name, definition] of Object.entries(encoding.fields)) {
        if (definition.isKey === true)
          encoding.fields[name] = { type: definition.type, isKey: true };
        else
          encoding.fields[name] = definition.type;
      }
    }

    logger.verbose(encoding);
    logger.debug(JSON.stringify(encoding.fields, null, " "));
    if (tract.terminal.output) {
      logger.info("encoding saved to " + tract.terminal.output);
      await fs.writeFile(tract.terminal.output, JSON.stringify(encoding, null, " "));
    }
    else {
      console.log(JSON.stringify(encoding, null, " "));
    }

  }
  catch (err) {
    logger.error(err);
    retcode = -1;
  }
  finally {
    await jo.relax();
  }

  return retcode;
};
