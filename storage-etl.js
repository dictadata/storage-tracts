#!/usr/bin/env node
/**
 * storage-etl
 */
"use strict";

const { StorageError } = require("@dictadata/storage-junctions/types");
const config = require('./storage/etl/config');
const logger = require('./storage/etl/logger')

const list = require("./storage/etl/list");
const codify = require('./storage/etl/codify');
const scan = require('./storage/etl/scan');
const transfer = require('./storage/etl/transfer');
const dull = require('./storage/etl/dull');
const copy = require('./storage/etl/copy');

const colors = require('colors');
const path = require('path');

// set program argument defaults
const appArgs = {
  tractsFile: './etl_tracts.json',
  tractName: '',  // tract name to process
  schemaName: ''  // replacement value
}

/**
 * parseArgs
 *   only tractName is required
 *   example process.argv  ["node.exe", "storage-etl.js", "-t", <tractsFile>, <tractName>, [schemaName]]
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
    else if (!myArgs.tractName) {
      myArgs.tractName = process.argv[i];
    }
    else if (!myArgs.schemaName) {
      myArgs.schemaName = process.argv[i];
    }
    ++i;
  }

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

    if (!appArgs.tractName) {
      console.log("Transfer, transform and codify data between local and distributed storage sources.");
      console.log("");
      console.log("etl [-t tractsFile] [tractName] [schemaName]");
      console.log("");
      console.log("tractsFile");
      console.log("  JSON configuration file that defines tracts, plug-ins and logging.");
      console.log("  Default configuration file is ./etl_tracts");
      console.log("");
      console.log("tractName");
      console.log("  The tract to follow in the configuration file.");
      console.log("  If 'action' is not defined in the tract then action defaults to the tractName.");
      console.log("");
      console.log("schemaName");
      console.log("  A string value that will replace the string '${schema}' in the tract.");
      console.log("  The value will replace all occurences of ${schema} using regex.");
      console.log("");
      console.log("Actions:");
      console.log("  config - create example etl_tracts.json file in the current directory.");
      console.log("  list - listing of schema names in a data store.");
      console.log("  codify - determine schema encoding by codifying a single schema.");
      console.log("  scan - list data store and determine schema encoding by codifying multiple schemas.");
      console.log("  transfer - transfer data between data stores with optional transforms.");
      console.log("  dull - remove data from a data store.");
      console.log("  copy - copy data files between remote file system and local file system.");
      console.log("  all - run all tracts in sequence.");
      console.log("  parallel - run all tracts in parallel.");
      console.log("");
      return;
    }

    let tracts = {};
    if (appArgs.tractName === 'config') {
      await config.createTracts(appArgs.tractsFile);
      return 0;
    } else {
      tracts = await config.loadTracts(appArgs.tractsFile, appArgs.schemaName);
    }

    if (Object.keys(tracts).length <= 0)
      throw new StorageError(400, "no storage tracts defined");

    if (appArgs.tractName === "all") {
      for (let name of Object.keys(tracts)) {
        if (name[0] === "_") continue;
        retCode = await processTract(name, tracts[name]);
        if (retCode)
          break;
      }
    }
    else if (appArgs.tractName === "parallel") {
      let tasks = [];
      for (let name of Object.keys(tracts)) {
        if (name[0] === "_") continue;
        tasks.push(processTract(name, tracts[name]));
      }
      Promise.allSettled(tasks);
    }
    else {
      retCode = await processTract(appArgs.tractName, tracts[appArgs.tractName]);
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


/**
 * 
 * @param {*} tractName 
 * @param {*} tract 
 */
async function processTract(tractName, tract) {
  if (typeof tract !== 'object')
    throw new StorageError(422, "storage tract not found " + tractName);

  let action = tract["action"] || tractName.substr(0, tractName.indexOf('_')) || tractName;

  switch (action) {
    case 'config':
      // should never get here, see above 'config' code
      return config.createTracts();
    case 'list':
      return list(tract);
    case 'codify':
      return codify(tract);
    case 'scan':
      return scan(tract);
      break;
    case 'transfer':
      return transfer(tract);
    case 'dull':
      return dull(tract);
    case 'copy':
      return copy(tract);
    default:
      logger.error("unknown action: " + action);
      return 1;
  }

}
