/**
 * etl/codify
 */
"use strict";

const storage = require("@dictadata/storage-junctions");

const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);


module.exports = async (config) => {
  console.log("codify ...");

  var j1;
  try {
    j1 = storage.activate(config.source.smt, config.source.options);
    
    // first load the source encoding
    config.encoding = await j1.getEncoding();

    if (config.transforms) {
      // run some constructs through the transforms
      // to get the resulting encoding
      let rs = j1.getReadStream({ codify: true, max_read: 1000 });
      let tr = j1.getTransform(config.transforms);
      let cf = j1.getCodifyWriter();
      await pipeline([rs,tr,cf]);
      config.encoding = await cf.getEncoding();
    }

    //console.log(">>> encoding results");
    //console.log(encoding);
    //console.log(JSON.stringify(encoding.fields, null, "  "));

    return ("Codify comlete.");
  }
  catch (err) {
    console.error('encoding failed: ' + err.message);
    throw(err);
  }
  finally {
    await j1.relax();
  }

};
