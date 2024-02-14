#!/usr/bin/env node
/* eslint-disable node/shebang */
/**
 * storage/etl
 */
"use strict";

const { Actions } = require("../index");
const config = require('./config');
const { logger } = require('../utils');
const path = require('path');
require('colors');

// set program argument defaults
const appArgs = {
  config: './etl.config.json',
  tracts: './etl.tracts.json',
  name: '',  // tract name to process
  params: {}
};

/**
 * parseArgs
 *   only tractName is required
 *   example process.argv  ["node.exe", "storage/etl/index.js", "-c", <configFile>, "-t", <tracts>, <tractName>]
 */
function parseArgs() {

  let i = 2;
  while (i < process.argv.length) {
    // configFile
    if (process.argv[ i ] === "-c") {
      if (i + 1 < process.argv.length) {
        appArgs.config = process.argv[ i + 1 ];
        ++i;
        if (!appArgs.config.includes("."))
          appArgs.config = "etl.config." + appArgs.config + ".json";  // dev, prod, ...
        if (!path.extname(appArgs.config))
          appArgs.config += ".config.json";
      }
    }
    // tractsFile
    else if (process.argv[ i ] === "-t") {
      if (i + 1 < process.argv.length) {
        appArgs.tracts = process.argv[ i + 1 ];
        ++i;
        if (!path.extname(appArgs.tracts))
          appArgs.tracts += ".tracts.json";
      }
    }
    else if (!appArgs.name) {
      appArgs.name = process.argv[ i ];
    }
    else {
      let v = process.argv[ i ];
      let nv = v.split('=');
      if (nv.length === 1)
        appArgs.params[ nv[ 0 ] ] = true;
      else
        appArgs.params[ nv[ 0 ] ] = nv[ 1 ];
    }
    ++i;
  }

}

/**
 * Program entry point.
 */
(async () => {
  let retCode = 0;

  parseArgs();

  console.log("Storage ETL " + config.version);
  console.log("Copyright 2022 dictadata.net | The MIT License");

  if (!appArgs.name) {
    console.log("Transfer, transform and codify data between local and distributed storage sources.");
    console.log("");
    console.log("etl [-c configFile] [-t tracts] tractName");
    console.log("");
    console.log("configFile");
    console.log("  JSON configuration file that defines engrams, plug-ins and logging.");
    console.log("  Supports abbreviated name; '-c dev' for './etl.config.dev.json'");
    console.log("  Default configuration file is ./etl.config.json");
    console.log("");
    console.log("tracts");
    console.log("  ETL tracts filename or Tracts urn that contains tracts to process.");
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
    console.log("  engrams - manage engrams encoding definitions");
    console.log("  tracts - manage tracts definitions");
    console.log("  scan - list schemas, e.g. files, at origin and perform sub-actions for each schema.");
    console.log("  iterate - retrieve data and perform child action(s) for each construct.");
    console.log("  all | * - run all tracts in sequence.");
    console.log("  parallel - run all tracts in parallel.");
    console.log("");
    return;
  }

  try {
    // load tracts file
    let tracts = await config.loadFiles(appArgs);

    retCode = await Actions.perform(tracts, appArgs.name, appArgs.params);
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
