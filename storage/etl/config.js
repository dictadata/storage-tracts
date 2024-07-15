/**
 * storage/etl/config
 */
"use strict";

const Storage = require('../storage');
const { StorageError } = require('@dictadata/storage-junctions/types');
const { logger } = require('@dictadata/lib');
const { objCopy, findFile } = require('@dictadata/lib');
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
    "junctions": [],
    "transforms": []
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
      let filename = await findFile(nested);
      let nestedText = await readFile(filename, { encoding: 'utf8' });
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
  logger.configDaily(config.log);

  //// load auth_file
  if (config.auth?.auth_file) {
    let file = await findFile(config.auth.auth_file);
    Storage.auth.load(file);
  }

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
  //let nmp = await findModules();

  // filesystem plugins
  if (Object.hasOwn(plugins, "filesystems")) {
    for (let [ prefix, modName ] of Object.entries(plugins[ "filesystems" ])) {
      let tFilesystem = require(modName);
      Storage.FileSystems.use(prefix, tFilesystem);
    }
  }

  // junction plugins
  if (Object.hasOwn(plugins, "junctions")) {
    for (let [ model, modName ] of Object.entries(plugins[ "junctions" ])) {
      let tJunction = require(modName);
      Storage.Junctions.use(model, tJunction);
    }
  }

  // transform plugins
  if (Object.hasOwn(plugins, "transforms")) {
    //console.log("CWD: " + process.cwd());
    for (let [ name, modName ] of Object.entries(plugins[ "transforms" ])) {
      let tTransform = require(join(process.cwd(), modName));
      Storage.Transforms.use(name, tTransform);
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
