#!/usr/bin/env node
/* eslint-disable node/shebang */
/**
 * storage/etl
 */
"use strict";

const { Tracts } = require('../tracts');
const { Actions } = require('../index');
const config = require('./config');
const { logger } = require('@dictadata/lib');
const { objCopy } = require('@dictadata/lib');
const path = require('node:path');
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
 *   only fiber-name is required
 *   example process.argv  ["node.exe", "storage/etl/index.js", "-c", <configFile>, "-t", <tract>, <fiber-name>]
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
    console.log("etl [-c configFile] [-t tract] fiber-name");
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
    console.log("fiber-name");
    console.log("  The fiber to perform in the ETL tract file. Required. Use '*' to process all fibers.");
    console.log("");
    console.log("Actions:");
    console.log("  transfer - transfer data between data stores with optional transforms.");
    console.log("  retrieve - retrieve data with fallback to a source origin.");
    console.log("  foreach - retrieve data and perform child fiber(s) for each construct.");
    console.log("  tee - transfer data between origin and multiple destinations.");
    console.log("  dull - remove data from a data store.");
    console.log("");
    console.log("  list - listing of schema names at origin (data store or file system).");
    console.log("  scan - list schemas, e.g. files, at origin and perform sub-fibers for each schema.");
    console.log("  copy - copy data files between remote file system and local file system.");
    console.log("");
    console.log("  schema - manage a schema instance.");
    console.log("  codify - determine schema's encoding by examining some data.");
    console.log("");
    console.log("  engrams - manage engrams encoding definitions.");
    console.log("  tracts - manage tracts definitions.");
    console.log("");
    console.log("  all | * - run all fibers in sequence.");
    console.log("  parallel - run all fibers in parallel.");
    console.log("");
    console.log("  @dictadata/storage-tracts@" + config.version);
    console.log("  " + junctionsPkg.name + "@" + junctionsPkg.version);
    return;
  }

  try {
    // load tract file
    let tract = await config.loadFiles(appArgs);

    // if URN then recall from Tracts storage
    if (typeof tract === "string") {
      // tract is a urn; realm:tract
      let results = await Tracts.recall(tract, true);
      tract = results.data[ 0 ];
    }

    if (appArgs.name === "all" || appArgs.name === "*") {
      for (let fiber of tract.fibers) {
        if (fiber.name[ 0 ] === "_")
          continue;

        if (fiber.base) {
          let base = tract.fibers.find((f) => f.name === fiber.base);
          fiber = objCopy({}, base, fiber);
        }

        retCode = await Actions.perform(fiber, appArgs.params);
        if (retCode)
          break;
      }
    }
    else if (appArgs.name === "parallel") {
      let tasks = [];
      for (let fiber of tract.fibers) {
        if (fiber.name[ 0 ] === "_")
          continue;

        if (fiber.base) {
          let base = tract.fibers.find((f) => f.name === fiber.base);
          fiber = objCopy({}, base, fiber);
        }

        tasks.push(Actions.perform(fiber, appArgs.params));
      }
      await Promise.allSettled(tasks);
    }
    else {
      // fibers can be chained through the retCode
      let name = appArgs.name;
      while (name) {
        let fiber = tract.fibers.find((fiber) => fiber.name === name);

        if (!fiber) {
          logger.error("tract name not found: " + name);
          retCode = 1;
          break;
        }

        if (fiber.base) {
          let base = tract.fibers.find((f) => f.name === fiber.base);
          fiber = objCopy({}, base, fiber);
        }

        retCode = await Actions.perform(fiber, appArgs.params);
        name = (typeof retCode === "string") ? retCode : "";
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
