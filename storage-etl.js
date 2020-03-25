#!/usr/bin/env node
/**
 * storage-etl
 */
"use strict";

const config = require('./lib/config');
const logger = require('./lib/logger')

const codify = require('./lib/codify');
const list = require("./lib/list");
const scan = require('./lib/scan');
const transfer = require('./lib/transfer');

var appArgs = {
  command: '',
  configfile: 'config.json',
  source: 'source',
  destination: 'destination'
}

function parseArgs() {
  // ["node.exe", "storage-etl.js", command, "-c", configfile, source, destination]
  // only command is required
  let i = 2;
  while (i < process.argv.length) {
    if (!appArgs.command) {
      appArgs.command = process.argv[i];
    }
    else if (process.argv[i] === "-c") {
      if (i + 1 < process.argv.length) {
        appArgs.configfile = process.argv[i + 1];
        ++i;
      }
    }
    else if (!appArgs.source) {
      appArgs.source = process.argv[i];
    }
    else if (!appArgs.destination) {
      appArgs.destination = process.argv[i];
    }
    ++i;
  }
}

(async () => {
  let retcode = 0;

  try {
    parseArgs();
    config.load(appArgs.configfile);
    logger.configLogger(config.log);
    logger.verbose("storage-etl starting...");

    if (!appArgs.command) {
      console.log("Transfer, transform and codify data storage sources.");
      console.log("");
      console.log("etl command [-c configfile] [source] [destination] [transform]");
      console.log("");
      console.log("Commands:");
      console.log("  codify - determine storage encoding for a single schema");
      console.log("  list - listing of schema names in data source");
      console.log("  scan - scan data source to determine storage encoding by codifying multiple schemas");
      console.log("  transfer - transfer data between two data sources, with optional transform");
      return;
    }

    let source = config.datastorage[appArgs.source];
    let destination = config.datastorage[appArgs.destination];
    switch (appArgs.command) {
      case 'codify':
        retcode = await codify(source);
        break;
      case 'list':
        retcode = await list(source);
        break;
      case 'scan':
        retcode = await scan(source);
        break;
      case 'transfer':
        retcode = await transfer(source, destination);
        break;
      default:
        console.log("unknown command: " + appArgs.command);
        retcode = -1;
        break;
    }

  }
  catch (err) {
    logger.error(err);
    retcode = -1;
  }

  if (retcode === 0)
    logger.verbose("OK");
  else
    console.log("ETL failed, check error log.");

  return retcode;
})();
