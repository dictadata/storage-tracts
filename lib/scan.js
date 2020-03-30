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
module.exports = async (source, transforms) => {
  logger.verbose("scan ...");
  let retcode = 0;

  var j1;
  try {
    let options = source.options || {};
    if (!options.codify) options.codify = {};
    if (!options.codify.encoding) options.codify.encoding = {};
    if (!transforms) transforms = {};

    // Note that encodings will be updated in options.codify.encoding
    // and used between instances of CodifyWriter.

/*
    options.list.forEach = async (filename) => {
      logger.verbose(filename);
      let smt = Object.assign({}, j1.smt, {schema: filename});
      let j2 = await storage.activate(smt, source.options);
      let codify = await j2.getTransform('codify', options.codify);
      await pipeline(j2.getReadStream(), codify);
    };
*/
    j1 = await storage.activate(source.smt, options);
    let list = await j1.list();

    // loop through files
    for (let filename of list) {
      let smt2 = Object.assign({}, j1.smt, {schema: filename});
      let j2 = await storage.activate(smt2, source.options);

      logger.verbose("build pipeline");
      let pipes = [];
      pipes.push(j2.getReadStream());
      for (let [tfType, options] of Object.entries(transforms))
        pipes.push(j1.getTransform(tfType, options));
      pipes.push(j1.getTransform('codify', options.codify));
      await pipeline(pipes);
      j2.relax();
    }

    logger.debug(JSON.stringify(options.codify.encoding, null, " "));

    if (source.outputFile) {
      logger.info("encoding saved to " + source.outputFile);
      await fs.promises.writeFile(source.outputFile, JSON.stringify(options.codify.encoding, null, " "));
    }
    else {
      console.log(JSON.stringify(options.codify.encoding, null, " "));
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
