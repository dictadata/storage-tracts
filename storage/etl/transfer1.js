/**
 * etl/transfer
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const stream = require('stream/promises');

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("transfer ...");
  let retCode = 0;

  var j1, j2;
  try {
    if (!Object.prototype.hasOwnProperty.call(source, "codify")) source.codify = true;
    if (!Object.prototype.hasOwnProperty.call(destination, "create")) destination.create = true;
    if (!source.options) source.options = {};
    if (!transforms) transforms = {};

    j1 = await storage.activate(source.smt, source.options);
    j2 = await storage.activate(destination.smt, destination.options);

    logger.verbose("input: " + j1.engram.toString());
    logger.verbose("output: " + j2.engram.toString());
    logger.verbose("transform: " + (Object.keys(transforms).length > 0));

    let results = await j1.getEncoding();
    source.encoding = results.data["encoding"];

    if (source.codify || Object.keys(transforms).length > 0) {
      let pipes = [];
      pipes.push(j1.createReader(source.options || { max_read: 100 }));
      for (let [tfType, tfOptions] of Object.entries(transforms))
        pipes.push(j1.createTransform(tfType, tfOptions));
      let ct = j1.createTransform('codify');
      pipes.push(ct);

      await stream.pipeline(pipes);
      let results = await ct.getEncoding();
      source.encoding = results.data["encoding"];
    }

    if (destination.create) {
      j2.putEncoding(source.encoding);
    }

    logger.verbose("transfer pipeline ...");
    var pipes = [];
    pipes.push(j1.createReader());
    for (let [tfType, options] of Object.entries(transforms))
      pipes.push(j1.createTransform(tfType, options));
    pipes.push(j2.createWriter());

    await stream.pipeline(pipes);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }
  finally {
    await j1.relax();
    await j2.relax();
  }

  return retCode;
};
