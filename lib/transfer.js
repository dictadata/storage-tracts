/**
 * etl/transfer
 */
"use strict";

const storage = require("@dicta-io/storage-junctions");
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

module.exports = async function (options) {

  try {
    //console.log(">>> create junctions");

    var j1 = storage.activate(options.source.smt, options.source.options);
    var j2 = storage.activate(options.destination.smt, options.destination.options);

    console.log("input: " + j1._engram.toString());
    console.log("output: ", j2._engram.toString());
    console.log("transform: ", (options.transforms !== null));

    console.log("encoding ...");
    // first load the source encoding
    await j1.getEncoding();

    // run some constructs through the transforms
    var codifyPipeline = [j1.getReadStream({ codify: true, max_read: 1000 })];
    if (options.transforms)
      codifyPipeline.push(j1.getTransform(options.transforms));
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
    if (options.transforms)
      transformPipeline.push(j1.getTransform(options.transforms));
    transformPipeline.push(j2.getWriteStream());

    await pipeline(transformPipeline);

    await j1.relax();
    await j2.relax();
    console.log("completed.");

  }
  catch (err) {
    console.error('Pipeline failed:' + JSON.stringify(err, null, "  "));
  }

};
