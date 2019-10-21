/**
 * etl/process
 */
"use strict";

const storage = require("@dicta-io/storage-junctions");
const encode = require('./encoder');
const transfer = require('./transfer').default;
const fs = require('fs');

module.exports = async (config) => {

  try {
    // open junctions
    config.source.junction = storage.activate(config.source.smt, config.source.options);
    if (config.destination && config.destination.smt)
      config.destination.junction = storage.activate(config.destination.smt, config.destination.options);

    // encoding step
    if (config.source.encode) {
      config.encoding = encode(config.source.junction);
    }
    else if  (typeof config.encoding === "string") {
      // config contains name of encoding file
      config.encoding = JSON.parse(fs.readFileSync(config.encoding, 'utf-8'));
    }

    if (config.destination && config.destination.encode)
      config.destination.junction.putEncoding(config.encoding);
    else
      console.log(JSON.stringify(config.encoding,null, " "));

    // transfer step
    if (config.destination) {
      transfer(config);
    }
  }
  catch (err) {
    console.error('process failed:' + JSON.stringify(err, null, "  "));
  }
  finally {
    // release junctions
    config.source.junction.relax();
    if (config.destination && config.destination.junction)
      config.destination.junction.relax();
  }

};
