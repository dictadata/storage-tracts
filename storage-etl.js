#!/usr/bin/env node
/**
 * storage-etl
 */
"use strict";

const Config = require('./lib/config');
const codify = require('./lib/codify');
const transfer = require('./lib/transfer');
const consolidate = require('./lib/consolidate');

(async () => {

  try {
    var config = Config();
    var argv = process.argv.slice(2);
    var results = {};

    if (argv.length > 1) {
      switch (argv[0]) {
      case 'encode':
        results = await codify(config);
        break;
      case 'convert':
      case 'transfer':
        results = await transfer(config);
        break;
      case 'consolidate':
        results = await consolidate(config);
        break;
      default:
        results = {results: "unknown command: " + argv[0]};
        break;
      }

      console.log( results );
    }
    else {
      console.log("Usage:  storage-etl convert <source> <destination> [tranforms]");
      console.log("        storage-etl codify <config.json>");
      console.log("        storage-etl transfer <config.json> <params>");
      console.log("        storage-etl consolidate <config.json> <params>");
      //console.log("        storage-etl scan <config.json>");
      //console.log("        storage-etl dbscan <config.json>");
      return;
    }

  }
  catch (err) {
    console.error('ETL failed: ' + err.message);
  }

})();
