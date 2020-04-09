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

const appArgs = {
  command: '',
  configfile: 'etl_config.json',
  source: 'source',
  destination: 'destination'
}

function parseArgs() {
  // ["node.exe", "storage-etl.js", command, "-c", configfile, source, destination]
  // only command is required

  const myArgs = {}

  let i = 2;
  while (i < process.argv.length) {
    if (!myArgs.command) {
      // command
      myArgs.command = process.argv[i];
    }
    else if (process.argv[i] === "-c") {
      // configFile
      if (i + 1 < process.argv.length) {
        myArgs.configfile = process.argv[i + 1];
        ++i;
      }
    }
    else if (!myArgs.source) {
      // source
      myArgs.source = process.argv[i];
    }
    else if (!myArgs.destination) {
      // destination
      myArgs.destination = process.argv[i];
    }
    ++i;
  }

  Object.assign(appArgs, myArgs);
}

(async () => {
  let retcode = 0;

  try {
    parseArgs();
    config.load(appArgs.configfile);
    logger.verbose("storage-etl starting...");

    if (!appArgs.command) {
      console.log("Transfer, transform and codify data storage sources.");
      console.log("");
      console.log("etl command [-c configfile] [source] [destination] [transform]");
      console.log("");
      console.log("Commands:");
      console.log("  config - create example etl_config.json file in the current directory");
      console.log("  codify - determine storage encoding for a single schema");
      console.log("  list - listing of schema names in data source");
      console.log("  scan - scan data source to determine storage encoding by codifying multiple schemas");
      console.log("  transfer - transfer data between two data sources, with optional transform");
      return;
    }

    if (appArgs.command === 'config') {
      config.create();
      return 0;
    }

    if (Object.keys(config.storage).length <= 0 )
      throw new Error("No storage sources defined");
    let source = config.storage[appArgs.source];
    if (!source)
      throw new Error("Storage source not defined: " + appArgs.source);
    let destination = config.storage[appArgs.destination];

    switch (appArgs.command) {
      case 'config':
        config.create();
        break;
      case 'codify':
        retcode = await codify(source, config.transforms);
        break;
      case 'list':
        retcode = await list(source);
        break;
      case 'scan':
        retcode = await scan(source, config.transforms);
        break;
      case 'transfer':
        if (!destination)
          throw new Error("Storage destination not defined: " + appArgs.destination);
        retcode = await transfer(source, destination, config.transforms);
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
