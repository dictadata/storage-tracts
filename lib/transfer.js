/**
 * etl/transfer
 */
"use strict";

const storage = require("@dicta-io/storage-junctions");
const codify = require('./codify');

const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

module.exports = async (config) => {

  //console.log(">>> create junctions");
  var j1 = storage.activate(config.source.smt, config.source.options);
  var j2 = storage.activate(config.destination.smt, config.destination.options);

  try {
    console.log("input: " + j1._engram.toString());
    console.log("output: ", j2._engram.toString());
    console.log("transform: ", (config.transforms !== null));

    if (config.source.codify) {
      await codify(config);
    }
    if (config.destination.create) {
      j2.putEncoding(config.encoding);
    }

    console.log("transfer ...");
    var transformPipeline = [j1.getReadStream()];
    if (config.transforms)
      transformPipeline.push(j1.getTransform(config.transforms));
    transformPipeline.push(j2.getWriteStream());

    await pipeline(transformPipeline);

    return ("Transfer comlete.");
  }
  catch (err) {
    console.error('Pipeline failed: ' + err.message);
    throw err;
  }
  finally {
    await j1.relax();
    await j2.relax();
  }

};
