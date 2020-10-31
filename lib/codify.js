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

  var j1;
  try {
    let origin = tract.origin || {};
    let transforms = tract.transforms || {};

    j1 = await storage.activate(origin.smt, origin.options);

    // build pipeline
    let pipes = [];
    pipes.push(j1.getReadStream(origin.options.reader || { max_read: 100 }));
    for (let [tfType, options] of Object.entries(transforms))
      pipes.push(j1.getTransform(tfType, options));
    let ct = j1.getTransform('codify');
    pipes.push(ct);

    await stream.pipeline(pipes);
    let encoding = await ct.getEncoding();
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
    await j1.relax();
  }

  return retcode;
};
