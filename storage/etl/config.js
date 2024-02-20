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
  let tract = {};
  let config = Object.assign({}, configDefaults);

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
    objCopy(tract, configObj);
  }
  catch (err) {
    console.warn(err.message);
  }

  if (appArgs.tract.endsWith(".json")) {
    // tract file
    let tractText = await fs.readFileSync(appArgs.tract, { encoding: 'utf8' });
    let tractObj = JSON.parse(tractText);
    if (tractObj?._config) {
      objCopy(config, tractObj._config);
      delete tractObj._config;
    }
    if (tractObj?.params) {
      objCopy(appArgs.params, tractObj.params);
      delete tractObj.params;
    }
    objCopy(tract, tractObj);
  }
  else
    tract = appArgs.tract;

  // initialize app
  await configStorage(config);

  return tract;
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
