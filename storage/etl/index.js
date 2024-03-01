#!/usr/bin/env node
/* eslint-disable node/shebang */
/**
 * storage/etl
 */
"use strict";

const { Tracts } = require("../tracts");
const { Actions } = require("../index");
const config = require('./config');
const { logger } = require('../utils');
const { objCopy } = require('@dictadata/storage-junctions/utils')
const path = require('path');
require('colors');

const junctionsPkg = require('@dictadata/storage-junctions/package.json');

// set program argument defaults
const appArgs = {
  config: './etl.config.json',
  tract: './etl.tract.json',
  name: '',  // tract name to process
  params: {}
};

/**
 * parseArgs
 *   only actionName is required
 *   example process.argv  ["node.exe", "storage/etl/index.js", "-c", <configFile>, "-t", <tract>, <actionName>]
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
          appArgs.config = "etl." + appArgs.config + ".config.json";  // dev, prod, ...
        if (!path.extname(appArgs.config))
          appArgs.config += ".config.json";
      }
    }
    // tractFile
    else if (process.argv[ i ] === "-t") {
      if (i + 1 < process.argv.length) {
        appArgs.tract = process.argv[ i + 1 ];
        ++i;
        if (!path.extname(appArgs.tract))
          appArgs.tract += ".tract.json";
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
    console.log("etl [-c configFile] [-t tract] actionName");
    console.log("");
    console.log("configFile");
    console.log("  JSON configuration file that defines engrams, plug-ins and logging.");
    console.log("  Supports abbreviated name; '-c dev' for './etl.dev.config.json'");
    console.log("  Default configuration file is ./etl.config.json");
    console.log("");
    console.log("tract");
    console.log("  ETL tract filename or Tracts urn that contains tract to process.");
    console.log("  Default tract file is ./etl.tract.json");
    console.log("");
    console.log("actionName");
    console.log("  The action to perform in the ETL tract file. Required. Use '*' to process all actions.");
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
    console.log("  all | * - run all actions in sequence.");
    console.log("  parallel - run all actions in parallel.");
    console.log("");
    console.log("  " + junctionsPkg.name + "@" + junctionsPkg.version);
    return;
  }

  try {
    // load tract file
    let tract = await config.loadFiles(appArgs);

    // if URN then recall from Tracts storage
    if (typeof tract === "string") {
      // check for action name in urn; domain:tract#action
      let u = tract.split('#');
      let urn = u[ 0 ];
      if (u.length > 1 && !appArgs.name)
        appArgs.name = u[ 1 ];

      let results = await Tracts.recall(urn, true);
      tract = results.data[ 0 ];
    }

    let base = tract.actions.find((action) => action.name === "_base");

    if (appArgs.name === "all" || appArgs.name === "*") {
      for (let action of tract.actions) {
        if (action.name[ 0 ] === "_")
          continue;
        if (base)
          action = objCopy({}, base, action);
        retCode = await Actions.perform(action, appArgs.params);
        if (retCode)
          break;
      }
    }
    else if (appArgs.name === "parallel") {
      let tasks = [];
      for (let action of tract.actions) {
        if (action.name[ 0 ] === "_")
          continue;
        if (base)
          action = objCopy({}, base, action);
        tasks.push(Actions.perform(action, appArgs.params));
      }
      await Promise.allSettled(tasks);
    }
    else {
      let action = tract.actions.find((action) => action.name === appArgs.name);
      if (action) {
        if (base)
          action = objCopy({}, base, action);
        retCode = await Actions.perform(action, appArgs.params);
      }
      else {
        retCode = 1;
        logger.error("tract name not found: " + appArgs.name);
      }
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
