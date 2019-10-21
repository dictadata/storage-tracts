/**
 * etl/convertfile
 */
"use strict";

const storage = require("@dicta-io/storage-junctions");
const Config = require('./config');

const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

module.exports = async () => {

  var config = Config();

  //console.log(">>> create junctions");
  var j1 = storage.activate(config.source.smt, config.source.options);
  var j2 = storage.activate(config.destination.smt, config.destination.options);

  try {
    console.log("input: " + j1._engram.toString());
    console.log("output: ", j2._engram.toString());
    console.log("transform: ", (config.transforms !== null));

    console.log("encoding ...");
    // first load the source encoding
    await j1.getEncoding();

    // run some constructs through the transforms
    var codifyPipeline = [j1.getReadStream({ codify: true, max_read: 1000 })];
    if (config.transforms)
      codifyPipeline.push(j1.getTransform(config.transforms));
    var codify = j1.getCodifyTransform();
    codifyPipeline.push(codify);

    await pipeline(codifyPipeline);
    let encoding = await codify.getEncoding();
    j2.putEncoding(encoding);

    //console.log(">>> encoding results");
    //console.log(encoding);
    //console.log(JSON.stringify(encoding.fields, null, "  "));

    console.log("transfer ...");
    var transformPipeline = [j1.getReadStream()];
    if (config.transforms)
      transformPipeline.push(j1.getTransform(config.transforms));
    transformPipeline.push(j2.getWriteStream());

    await pipeline(transformPipeline);

    console.log("completed.");
  }
  catch (err) {
    console.error('Pipeline failed: ' + err.message);
  }
  finally {
    await j1.relax();
    await j2.relax();
  }

};
