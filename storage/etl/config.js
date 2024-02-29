/**
 * storage/etl/config
 */
"use strict";

const Storage = require("../storage");
const { StorageError } = require("@dictadata/storage-junctions/types");
const { logger, hasOwnProperty, objCopy, findModules } = require("@dictadata/storage-junctions/utils");
const Package = require('../../package.json');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');

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
    let configText = await readFile(appArgs.config, { encoding: 'utf8' });
    let configObj = JSON.parse(configText);

    let nested = configObj.config?.config;
    if (nested) {
      // read nested config file, lowest priority
      let nestedText = await readFile(nested, { encoding: 'utf8' });
      let nestedObj = JSON.parse(nestedText);

      if (nestedObj?.config)
        objCopy(config, nestedObj.config);
      if (nestedObj?.params)
        objCopy(appArgs.params, nestedObj.params);
    }

    if (configObj?.config)
      objCopy(config, configObj.config);
    if (configObj?.params)
      objCopy(appArgs.params, configObj.params);
  }
  catch (err) {
    console.warn(err.message);
  }

  if (appArgs.tract.endsWith(".json")) {
    // tract file
    let tractText = await readFile(appArgs.tract, { encoding: 'utf8' });
    let tractObj = JSON.parse(tractText);

    // highest priority config
    if (tractObj?.config)
      objCopy(config, tractObj.config);
    if (tractObj?.params)
      objCopy(appArgs.params, tractObj.params);

    objCopy(tract, tractObj);
  }
  else
    tract = appArgs.tract;  // should be a Tracts URN

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
  let nmp = await findModules();

  // filesystem plugins
  if (hasOwnProperty(plugins, "filesystems")) {
    for (let [ name, prefixes ] of Object.entries(plugins[ "filesystems" ])) {
      let stfs = require(join(nmp, name));
      for (let prefix of prefixes)
        Storage.FileSystems.use(prefix, stfs);
    }
  }

  // junction plugins
  if (hasOwnProperty(plugins, "junctions")) {
    for (let [ name, models ] of Object.entries(plugins[ "junctions" ])) {
      let junction = require(join(nmp, name));
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
