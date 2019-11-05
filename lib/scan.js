/**
 * etl/scan
 */
"use strict";

const storage = require("@dictadata/storage-junctions");

const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);


module.exports = async (config) => {
  console.log("scan ...");

  try {
    let scanOptions = config.scan || {};
    let codifyOptions = config.codify || {};
    codifyOptions.encoding = {},

    scanOptions.forEach = async (filename) => {
      console.log(filename);
      let smt = Object.assign({}, j1._engram.smt, {schema: filename});

      let j2 = storage.activate(smt, config.source.options);
      var codify = await j2.getCodifyTransform(codifyOptions);
      await pipeline(j2.getReadStream(), codify);
      //console.log(encoding);
    };

    var j1 = storage.activate(config.source.smt, config.source.options);
    await j1.scan(scanOptions);

    console.log(">>> encoding results");
    //console.log(encoding);
    console.log(JSON.stringify(codifyOptions.encoding, null, "  "));

    return ("scan comlete.");
  }
  catch (err) {
    console.error('scan failed: ' + err.message);
    throw(err);
  }
  finally {
    j1.relax();
  }

};
