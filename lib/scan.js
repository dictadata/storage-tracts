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
module.exports = async (source) => {
  logger.verbose("scan ...");
  let retcode = 0;

  try {
    let options = source.options || {};
    if (!options.codify) options.codify = {};
    if (!options.codify.encoding) options.codify.encoding = {};
/*
    options.list.forEach = async (filename) => {
      logger.verbose(filename);
      let smt = Object.assign({}, j1.smt, {schema: filename});
      let j2 = await storage.activate(smt, source.options);
      let codify = await j2.getCodifyWriter(options.codify);
      await pipeline(j2.getReadStream(), codify);
    };
*/
    let j1 = await storage.activate(source.smt, options);
    let list = await j1.list();
    j1.relax();

    // loop through files
    for (let filename of list) {
      let smt2 = Object.assign({}, j1.smt, {schema: filename});
      let j2 = await storage.activate(smt2, source.options);
      let codify = j1.getCodifyWriter();
      await pipeline(j2.getReadStream(), codify);
      j2.relax();
    }

    logger.verbose(JSON.stringify(options.codify.encoding, null, " "));

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
    //await j1.relax();
  }

  return retcode;
};
