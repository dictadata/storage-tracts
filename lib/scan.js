/**
 * etl/scan
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const stream = require('stream');
const fs = require('fs');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("scan ...");
  let retcode = 0;

  var j1;
  try {
    let origin = tract.origin || {};
    let transforms = tract.transforms || {};
    if (!origin.options) origin.options = {};
    if (!origin.options.codify) origin.options.codify = {};

    // Note that encodings will be updated in options.codify.encoding
    // and used between instances of CodifyWriter.

    j1 = await storage.activate(origin.smt, origin.options);
    let list = await j1.list();

    // loop through files
    for (let filename of list) {
      let smt2 = Object.assign({}, j1.smt, {schema: filename});
      let j2 = await storage.activate(smt2, origin.options);

      logger.verbose("build pipeline");
      let pipes = [];
      pipes.push(j2.getReadStream());
      for (let [tfType, toptions] of Object.entries(transforms))
        pipes.push(j1.getTransform(tfType, toptions));
      pipes.push(j1.getTransform('codify', origin.options.codify));
      await pipeline(pipes);
      j2.relax();
    }

    logger.debug(JSON.stringify(origin.options.codify.encoding, null, " "));

    if (origin.outputFile) {
      logger.info("encoding saved to " + origin.outputFile);
      await fs.promises.writeFile(origin.outputFile, JSON.stringify(origin.options.codify.encoding, null, " "));
    }
    else {
      console.log(JSON.stringify(origin.options.codify.encoding, null, " "));
    }

  }
  catch (err) {
    logger.error(err);
    retcode = -1;
  }
  finally {
    if (j1) await j1.relax();
  }

  return retcode;
};
