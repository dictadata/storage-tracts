/**
 * etl/transfer
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

/**
 *
 */
module.exports = async (source, destination, transforms) => {
  logger.verbose("transfer ...");
  let retcode = 0;

  var j1, j2;
  try {
    if (!Object.prototype.hasOwnProperty.call(source,"codify")) source.codify = true;
    if (!Object.prototype.hasOwnProperty.call(destination,"create")) destination.create = true;
    if (!source.options) source.options = {};
    if (!transforms) transforms = {};

    j1 = await storage.activate(source.smt, source.options);
    j2 = await storage.activate(destination.smt, destination.options);

    logger.verbose("input: " + j1.engram.toString());
    logger.verbose("output: " + j2.engram.toString());
    logger.verbose("transform: " + (Object.keys(transforms).length > 0));

    source.encoding = await j1.getEncoding();

    if (source.codify || Object.keys(transforms).length > 0) {
      let pipes = [];
      pipes.push(j1.getReadStream(source.options.reader || {max_read: 100}));
      for (let [tfType, tfOptions] of Object.entries(transforms))
        pipes.push(j1.getTransform(tfType, tfOptions));
      let ct = j1.getTransform('codify');
      pipes.push(ct);

      await pipeline(pipes);
      source.encoding = await ct.getEncoding();
    }

    if (destination.create) {
      j2.putEncoding(source.encoding);
    }

    logger.verbose("transfer pipeline ...");
    var pipes = [];
    pipes.push(j1.getReadStream());
    for (let [tfType, options] of Object.entries(transforms))
      pipes.push(j1.getTransform(tfType, options));
    pipes.push(j2.getWriteStream());

    await pipeline(pipes);
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
