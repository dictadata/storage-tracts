#!/usr/bin/env node
/**
 * etl/encoder
 */
"use strict";

const storage = require("@dicta-io/storage-junctions");

const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

module.exports = async (config) => {
  console.log("encoding ...");

  let j1 = storage.activate(config.source.smt, config.source.options);

  try {
    // first load the source encoding
    let encoding = await j1.getEncoding();

    if (config.transforms) {
      // run some constructs through the transforms
      // to get the resulting encoding
      var codifyPipeline = [
        j1.getReadStream({ codify: true, max_read: 1000 }),
        j1.getTransform(config.transforms),
        j1.getCodifyTransform()
      ];
      encoding = await pipeline(codifyPipeline);
    }

    //console.log(">>> encoding results");
    //console.log(encoding);
    //console.log(JSON.stringify(encoding.fields, null, "  "));

    return encoding;
  }
  catch (err) {
    console.error('encoding failed: ' + err.message);
    throw(err);
  }
  finally {
    j1.relax();
  }

};
