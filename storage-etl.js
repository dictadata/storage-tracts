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
  command: 'transfer',
  configfile: 'etl_config.json',
  tract: 'transfer'
}

function parseArgs() {
  // process.argv = ["node.exe", "storage-etl.js", command, "-c", configfile, tract]
  // only command is required

  const myArgs = {}

  let i = 2;
  while (i < process.argv.length) {
    if (process.argv[i] === "-c") {
      // configFile
      if (i + 1 < process.argv.length) {
        myArgs.configfile = process.argv[i + 1];
        ++i;
      }
    }
    else if (!myArgs.command) {
      // command
      myArgs.command = process.argv[i];
    }
    else if (!myArgs.tract) {
      // tract
      myArgs.tract = process.argv[i];
    }
    ++i;
  }

  if (myArgs.command && !myArgs.tract)
    myArgs.tract = myArgs.command;

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
      console.log("etl command [-c configfile] [tract-name]");
      console.log("");
      console.log("Commands:");
      console.log("  config - create example etl_config.json file in the current directory");
      console.log("  codify - determine storage encoding for a single schema");
      console.log("  list - listing of schema names in data source");
      console.log("  scan - scan data source to determine storage encoding by codifying multiple schemas");
      console.log("  transfer - transfer data between data sources, with optional transforms");
      return;
    }

    if (appArgs.command === 'config') {
      config.create();
      return 0;
    }

    if (Object.keys(config).length <= 0 )
      throw new Error("No storage tracts defined");
    let tract = config[appArgs.tract];
    if (!tract)
      throw new Error("Storage tract not defined: " + appArgs.tract);

    switch (appArgs.command) {
      case 'config':
        config.create();
        break;
      case 'codify':
        retcode = await codify(tract);
        break;
      case 'list':
        retcode = await list(tract);
        break;
      case 'scan':
        retcode = await scan(tract);
        break;
      case 'transfer':
        retcode = await transfer(tract);
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
