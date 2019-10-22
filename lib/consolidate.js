/**
 * etl/consolidate
 */
"use strict";

const transfer = require('./transfer');

module.exports = async (config) => {

  try {
    for (let [name,values] of Object.entries(config.consolidate)) {
      for (let value of values) {
        config.source.options.params[name] = value;
        console.log("transfer: " + name + "=" + value);
        await transfer(config);
      }
      break;  // just for one for now
    }

    return ("Consolidate complete.");
  }
  catch (err) {
    console.error('Consolidate failed: ' + err.message);
    throw err;
  }

};
