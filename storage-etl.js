#!/usr/bin/env node
/**
 * storage-etl
 */
"use strict";

const config = require('./storage/etl/config');
const logger = require('./storage/etl/logger')
const { StorageError } = require("@dictadata/storage-junctions").types;
const colors = require('colors');

const codify = require('./storage/etl/codify');
const list = require("./storage/etl/list");
const scan = require('./storage/etl/scan');
const transfer = require('./storage/etl/transfer');
const download = require('./storage/etl/download');
const upload = require('./storage/etl/upload');
const path = require('path');

// set program argument defaults
const appArgs = {
  tractsFile: './etl_tracts.json',
  command: '',
  tract: '',  // default tract name is the command name
  schema: ''  // replacement value
}

/**
 * parseArgs
 *   only command is required
 *   example process.argv  ["node.exe", "storage-etl.js", "-t", <tractsFile>, <command>, <tract>, [schemaName]]
 */
function parseArgs() {
  const myArgs = {};

  let i = 2;
  while (i < process.argv.length) {
    if (process.argv[i] === "-c" || process.argv[i] === "-t") {
      // tractsFile
      if (i + 1 < process.argv.length) {
        myArgs.tractsFile = process.argv[i + 1];
        ++i;
        if (!path.extname(myArgs.tractsFile))
          myArgs.tractsFile += ".json";
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
    else if (!myArgs.schema) {
      // tract
      myArgs.schema = process.argv[i];
    }
    ++i;
  }

  // tract name defaults to command name
  if (myArgs.command && !myArgs.tract)
    myArgs.tract = myArgs.command;

  Object.assign(appArgs, myArgs);
}

/**
 * Program entry point.
 */
(async () => {
  let retCode = 0;

  try {
    console.log("storage-etl (etl) " + config.version);
    parseArgs();

    if (!appArgs.command) {
      console.log("Transfer, transform and codify data between local and distributed storage sources.");
      console.log("");
      console.log("etl [-t tractsFile] [command] [tractName] [schemaName]");
      console.log("");
      console.log("Commands:");
      console.log("  config - create example etl_tracts.json file in the current directory.");
      console.log("  codify - determine storage encoding by codifying a single data source schema.");
      console.log("  list - listing of schema names in a data source.");
      console.log("  scan - list data source and determine storage encoding by codifying multiple schemas.");
      console.log("  transfer - transfer data between data sources with optional transforms.");
      console.log("  download - download schemas from remote files system to the local file system.");
      console.log("  upload - upload schemas from local file system to remote file system.");
      console.log("");
      console.log("tractsFile");
      console.log("  JSON configuration file that defines tracts, plug-ins and logging.");
      console.log("  Default configuration file is ./etl_tracts");
      console.log("");
      console.log("tractName");
      console.log("  The tract to follow in the configuration file.");
      console.log("  Default tractName is the command name.");
      console.log("schemaName");
      console.log("  A string value that will be replaced in the tract with regex.");
      console.log("  All occurences of ${schema} in the tract will be replace with schemaName.");
      return;
    }

    let tracts = {};
    if (appArgs.command !== 'config')
      tracts = await config.loadTracts(appArgs.tractsFile, appArgs.schema);
    else {
      await config.createTracts(appArgs.tractsFile);
      return 0;
    }

    if (Object.keys(tracts).length <= 0)
      throw new StorageError(400, "No storage tracts defined");
    let tract = tracts[appArgs.tract];
    if (!tract)
      throw new StorageError(400, "Storage tract not defined: " + appArgs.tract);

    switch (appArgs.command) {
      case 'config':
        // should never get here, see above 'config' code
        await config.createTracts();  
        break;
      case 'codify':
        retCode = await codify(tract);
        break;
      case 'list':
        retCode = await list(tract);
        break;
      case 'scan':
        retCode = await scan(tract);
        break;
      case 'transfer':
        retCode = await transfer(tract);
        break;
      case 'download':
        retCode = await download(tract);
        break;
      case 'upload':
        retCode = await upload(tract);
        break;
      default:
        logger.error("unknown command: " + appArgs.command);
        retCode = 1;
        break;
    }

  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  if (retCode === 0)
    logger.info("OK");
  else
    logger.error(retCode + " ETL failed, check error log.");

  process.exitCode = retCode;
})();
