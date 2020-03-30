/**
 * etl/codify
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const fs = require('fs');
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

/**
 *
 */
module.exports = async (source, transforms) => {
  logger.verbose("codify ...");
  let retcode = 0;

  var j1;
  try {
    let options = source.options || {};
    if (!transforms) transforms = {};

    j1 = await storage.activate(source.smt, options);

    // build pipeline
    let pipes = [];
    pipes.push(j1.getReadStream(source.options.reader || {max_read: 100}));
    for (let [tfType, options] of Object.entries(transforms))
      pipes.push(j1.getTransform(tfType, options));
    let ct = j1.getTransform('codify');
    pipes.push(ct);

    await pipeline(pipes);
    let encoding = await ct.getEncoding();

    logger.verbose(encoding);
    logger.debug(JSON.stringify(encoding.fields, null, " "));
    if (source.outputFile) {
      logger.info("encoding saved to " + source.outputFile);
      await fs.promises.writeFile(source.outputFile, JSON.stringify(encoding, null, " "));
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
