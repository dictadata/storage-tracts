/**
 * etl/transfer
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const codify = require('./codify');

const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

module.exports = async (config) => {
  logger.verbose("transfer ...");
  let retcode = 0;

  var j1, j2;
  try {
    j1 = storage.activate(config.source.smt, config.source.options);
    j2 = storage.activate(config.destination.smt, config.destination.options);

    logger.verbose("input: " + j1.engram.toString());
    logger.verbose("output: ", j2.engram.toString());
    logger.verbose("transform: ", (config.transform !== null));

    if (config.source.codify) {
      await codify(config);
    }
    if (config.destination.create) {
      j2.putEncoding(config.encoding);
    }

    logger.debug("transfer pipeline ...");
    var transformPipeline = [j1.getReadStream()];
    if (config.transform)
      transformPipeline.push(j1.getTransform(config.transform));
    transformPipeline.push(j2.getWriteStream());

    await pipeline(transformPipeline);

    return ("Transfer comlete.");
  }
  catch (err) {
    logger.error(err);
    retcode = -1;
  }
  finally {
    await j1.relax();
    await j2.relax();
  }

  return retcode;
};
