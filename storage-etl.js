#!/usr/bin/env node
/**
 * storage-etl
 */
"use strict";

const Config = require('./lib/config');
const codify = require('./lib/codify');
const transfer = require('./lib/transfer');

(async () => {

  try {
    var config = Config();
    var argv = process.argv.slice(2);
    var results = {};

    if (argv.length === 3) {
      results = transfer(config);
    }
    else if (argv.length === 2) {
      switch (argv[0]) {
      case 'encode':
        results = codify(config);
        break;
      case 'tranfer':
        results = transfer(config);
        break;
      default:
        results = {results: "unknown command: " + argv[0]};
        break;
      }

      console.log( JSON.stringify(results,null,"  "));
    }
    else {
      console.log("Usage:  storage-etl <source> <destination> [<transforms.json>]");
      console.log("        storage-etl codify <config.json>");
      console.log("        storage-etl transfer <config.json>");
      //console.log("        storage-etl scan <config.json>");
      //console.log("        storage-etl dbscan <config.json>");
      return;
    }

  }
  catch (err) {
    console.error('ETL failed: ' + err.message);
  }

})();
