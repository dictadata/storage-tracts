/**
 * storage/etl/config
 */
"use strict";

const Storage = require("../storage");
const { StorageError } = require("@dictadata/storage-junctions/types");
const { typeOf, logger, hasOwnProperty, objCopy } = require("@dictadata/storage-junctions/utils");
const Package = require('../../package.json');
const fs = require('fs');
const path = require('path');

module.exports.version = Package.version;

var configDefaults = {
  "engrams": {
    "smt": "",
    "options": {}
  },
  "tracts": {
    "smt": "",
    "options": {}
  },
  "log": {
    logPath: "./log",
    logPrefix: "etl",
    logLevel: "info"
  },
  "plugins": {
    "filesystems": [],
    "junctions": []
  }
};

/**
 *
 */
module.exports.loadFiles = async (appArgs) => {
  let tracts = {};

  try {
    let config = Object.assign({}, configDefaults);
    let errorMessage;

    try {
      // config file
      let configText = await fs.readFileSync(appArgs.config, { encoding: 'utf8' });
      let configObj = JSON.parse(configText);
      if (configObj?._config) {
        objCopy(config, configObj._config);
        delete configObj._config;
      }
      if (configObj?.params) {
        objCopy(appArgs.params, configObj.params);
        delete configObj.params;
      }
      objCopy(tracts, configObj);
    }
    catch (err) {
      errorMessage = err.message;
    }

    if (appArgs.tracts.endsWith(".json")) {
      // tracts file
      let tractsText = await fs.readFileSync(appArgs.tracts, { encoding: 'utf8' });
      let tractsObj = JSON.parse(tractsText);
      if (tractsObj?._config) {
        objCopy(config, tractsObj._config);
        delete tractsObj._config;
      }
      if (tractsObj?.params) {
        objCopy(appArgs.params, tractsObj.params);
        delete tractsObj.params;
      }
      objCopy(tracts, tractsObj);
    }
    else
      tracts = appArgs.tracts;

    // initialize app
    await configStorage(config);

    if (typeOf(tracts) === "object" && typeOf(tracts?.tracts) !== "object") {
      // reformat tract properties into an array, for backwards compatibility
      let tt = {
        "name": appArgs.name,
        "type": "tract",
        "tracts": []
      };
      for (let [ name, tract ] of Object.entries(tracts)) {
        tract.name = name
        tt.tracts.push(tract);
      }
      tracts = tt;
    }

  }
  catch (err) {
    logger.error(err.message);
  }

  return tracts;
};

/**
 *
 * @param {*} config
 */
async function configStorage(config) {

  //// config logger
  logger.configLogger(config.log);

  //// load auth_file
  if (config.auth?.auth_file)
    Storage.auth.load(config.auth.auth_file);

  //// engrams datastore initialization
  let engrams;
  if (config.engrams?.smt) {
    logger.verbose("Engrams SMT: " + JSON.stringify(config.engrams.smt, null, 2));
    engrams = await Storage.engrams.activate(config.engrams.smt, config.engrams.options);
  }
  else {
    logger.verbose("Engrams SMT: memory|dictadata|engrams|*");
    engrams = await Storage.engrams.activate("memory|dictadata|engrams|*");
  }

  //// register plugins
  let plugins = config.plugins || {};

  // filesystem plugins
  if (hasOwnProperty(plugins, "filesystems")) {
    for (let [ name, prefixes ] of Object.entries(plugins[ "filesystems" ])) {
      let stfs = require(path.resolve(name));
      for (let prefix of prefixes)
        Storage.FileSystems.use(prefix, stfs);
    }
  }

  // junction plugins
  if (hasOwnProperty(plugins, "junctions")) {
    for (let [ name, models ] of Object.entries(plugins[ "junctions" ])) {
      let junction = require(path.resolve(name));
      for (let model of models)
        Storage.Junctions.use(model, junction);
    }
  }

  //// tracts datastore initialization
  let tracts;
  if (config.tracts?.smt) {
    logger.verbose("Tracts SMT: " + JSON.stringify(config.tracts.smt, null, 2));
    tracts = await Storage.tracts.activate(config.tracts.smt, config.tracts.options);
  }
  else {
    logger.verbose("Tracts SMT: memory|dictadata|tracts|*");
    tracts = await Storage.tracts.activate("memory|dictadata|tracts|*");
  }

}
