#!/usr/bin/env node
/**
 * storage-etl
 */
"use strict";

const { StorageError } = require("@dictadata/storage-junctions/types");
const config = require('./storage/etl/config');
const logger = require('./storage/etl/logger');
const path = require('path');
const colors = require('colors');

const { addAction, performAction } = require("./storage/etl/actions");
addAction("list", require("./storage/etl/list"));
addAction("codify", require('./storage/etl/codify'));
addAction("scan", require('./storage/etl/scan'));
addAction("transfer", require('./storage/etl/transfer'));
addAction("dull", require('./storage/etl/dull'));
addAction("copy", require('./storage/etl/copy'));
addAction("codex", require('./storage/etl/codex'));

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
    if (process.argv[ i ] === "-c" || process.argv[ i ] === "-t") {
      // tractsFile
      if (i + 1 < process.argv.length) {
        myArgs.tractsFile = process.argv[ i + 1 ];
        ++i;
        if (!path.extname(myArgs.tractsFile))
          myArgs.tractsFile += ".json";
      }
    }
    else if (!myArgs.tractName) {
      myArgs.tractName = process.argv[ i ];
    }
    else if (!myArgs.schemaName) {
      myArgs.schemaName = process.argv[ i ];
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
    console.log("Copyright 2022 dictadata.org | The MIT License")
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
      console.log("  If 'action' is not defined in a tract then action defaults to the tractName.");
      console.log("");
      console.log("schemaName");
      console.log("  A string value that will replace the string '${schema}' in the tract.");
      console.log("  The value will replace all occurences of ${schema} using regex.");
      console.log("");
      console.log("Actions:");
      console.log("  transfer - transfer data between data stores with optional transforms.");
      console.log("  copy - copy data files between remote file system and local file system.");
      console.log("  list - listing of schema names at a locus (data store or file system).");
      console.log("  codify - determine schema's encoding by examining some data.");
      console.log("  dull - remove data from a data store.");
      console.log("  codex - manage codex encoding definitions");
      console.log("  scan - list schemas at a locus and perform an action on each schema.");
      console.log("  all | * - run all tracts in sequence.");
      console.log("  parallel - run all tracts in parallel.");
      console.log("  config - create example etl_tracts.json file in the current directory.");
      console.log("");
      return;
    }

    // load tracts file
    let tracts = {};
    if (appArgs.tractName === 'config') {
      await config.sampleTracts(appArgs.tractsFile);
      return 0;
    } else {
      tracts = await config.loadTracts(appArgs.tractsFile, appArgs.schemaName);
    }

    if (Object.keys(tracts).length <= 0)
      throw new StorageError(400, "no storage tracts defined");

    if (appArgs.tractName === "all" || appArgs.tractName === "*") {
      for (const [ key, tract ] of Object.entries(tracts)) {
        if (key[ 0 ] === "_") continue;
        retCode = await performAction(key, tract);
        if (retCode)
          break;
      }
    }
    else if (appArgs.tractName === "parallel") {
      let tasks = [];
      for (const [ key, tract ] of Object.entries(tracts)) {
        if (key[ 0 ] === "_") continue;
        tasks.push(performAction(key, tract));
      }
      Promise.allSettled(tasks);
    }
    else {
      retCode = await performAction(appArgs.tractName, tracts[ appArgs.tractName ]);
    }

  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  if (retCode === 0)
    logger.info("ETL results: OK");
  else
    logger.error(retCode + " ETL failed, check error log.");

  process.exitCode = retCode;
})();
