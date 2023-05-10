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
addAction("create", require('./storage/etl/create'));
addAction("codify", require('./storage/etl/codify'));
addAction("scan", require('./storage/etl/scan'));
addAction("iterate", require('./storage/etl/iterate'));
addAction("transfer", require('./storage/etl/transfer'));
addAction("dull", require('./storage/etl/dull'));
addAction("copy", require('./storage/etl/copy'));
addAction("codex", require('./storage/etl/codex'));
addAction("cortex", require('./storage/etl/cortex'));

// set program argument defaults
const appArgs = {
  configFile: './etl.config.json',
  etlTracts: './etl.tracts.json',
  tractName: ''  // tract name to process
}

/**
 * parseArgs
 *   only tractName is required
 *   example process.argv  ["node.exe", "storage-etl.js", "-c", <configFile>, "-t", <tracts>, <tractName>]
 */
function parseArgs() {
  const myArgs = {};

  let i = 2;
  while (i < process.argv.length) {
    // configFile
    if (process.argv[ i ] === "-c") {
      if (i + 1 < process.argv.length) {
        myArgs.configFile = process.argv[ i + 1 ];
        ++i;
        if (!myArgs.configFile.includes("."))
          myArgs.configFile = "etl.config." + myArgs.configFile + ".json";  // dev, prod, ...
        if (!path.extname(myArgs.configFile))
          myArgs.configFile += ".config.json";
      }
    }
    // etlTracts
    else if (process.argv[ i ] === "-t") {
      if (i + 1 < process.argv.length) {
        myArgs.etlTracts = process.argv[ i + 1 ];
        ++i;
        if (!path.extname(myArgs.etlTracts))
          myArgs.etlTracts += ".tracts.json";
      }
    }
    else if (!myArgs.tractName) {
      myArgs.tractName = process.argv[ i ];
    }
    else {
      console.error( ("Extra argument! " + process.argv[ i ]).bgRed );
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
    console.log("ETL (storage-etl) " + config.version);
    console.log("Copyright 2022 dictadata.net | The MIT License")
    parseArgs();

    if (!appArgs.tractName) {
      console.log("Transfer, transform and codify data between local and distributed storage sources.");
      console.log("");
      console.log("etl [-c configFile] [-t tracts] tractName");
      console.log("");
      console.log("configFile");
      console.log("  JSON configuration file that defines codex, plug-ins and logging.");
      console.log("  Supports abbreviated name; '-c dev' for './etl.config.dev.json'");
      console.log("  Default configuration file is ./etl.config.json");
      console.log("");
      console.log("tracts");
      console.log("  ETL tracts filename or Cortex urn that contains tracts to process.");
      console.log("  Default tract file is ./etl.tracts.json");
      console.log("");
      console.log("tractName");
      console.log("  The tract to follow in the ETL tracts file. Required. Use '*' to process all tracts.");
      console.log("  Shortcut syntax, if 'action' is not defined in the tract then action defaults to the tractName.");
      console.log("");
      console.log("Actions:");
      console.log("  transfer - transfer data between data stores with optional transforms.");
      console.log("  copy - copy data files between remote file system and local file system.");
      console.log("  list - listing of schema names at origin (data store or file system).");
      console.log("  codify - determine schema's encoding by examining some data.");
      console.log("  dull - remove data from a data store.");
      console.log("  codex - manage codex encoding definitions");
      console.log("  cortex - manage tracts definitions");
      console.log("  scan - list schemas, e.g. files, at origin and perform sub-actions for each schema.");
      console.log("  iterate - retrieve data and perform child action(s) for each construct.");
      console.log("  all | * - run all tracts in sequence.");
      console.log("  parallel - run all tracts in parallel.");
      console.log("  config - create example etl.tracts.json file in the current directory.");
      console.log("");
      return;
    }

    // load tracts file
    let etl_tracts = {};
    if (appArgs.tractName === 'config') {
      await config.sampleTracts(appArgs.etlTracts);
      return 0;
    }
    else {
      etl_tracts = await config.loadTracts(appArgs);
    }

    if (Object.keys(etl_tracts).length <= 0)
      throw new StorageError(400, "no storage tracts defined");

    if (appArgs.tractName === "all" || appArgs.tractName === "*") {
      for (const [ key, tract ] of Object.entries(etl_tracts)) {
        if (key[ 0 ] === "_")
          continue;
        retCode = await performAction(key, tract);
        if (retCode)
          break;
      }
    }
    else if (appArgs.tractName === "parallel") {
      let tasks = [];
      for (const [ key, tract ] of Object.entries(etl_tracts)) {
        if (key[ 0 ] === "_") continue;
        tasks.push(performAction(key, tract));
      }
      Promise.allSettled(tasks);
    }
    else {
      retCode = await performAction(appArgs.tractName, etl_tracts[ appArgs.tractName ]);
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
