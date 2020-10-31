/**
 * etl/config
 */
"use strict";

const logger = require('./logger');
const fs = require('fs/promises');
const storage = require("@dictadata/storage-junctions");

var defaults = {
  "_log": {
    logPath: "./log",
    logPrefix: "etl",
    logLevel: "info"
  }
};

/**
 *
 */
exports.create = function (configFilename) {

  try {
    let sampleConfig = {
      "tract-name": {
        "origin": {
          "smt": "csv|./|foofile.csv|*",
          "options": {},
          "encoding": {}
        },
        "transforms": {
          "filter": {},
          "select": {}
        },
        "terminal": {
          "smt": "json|./|foofile.json|*",
          "options": {},
          "encoding": {},
          "create": true
        }
      },
      "_plugins": {
        "filesystems": {
          "package_name": ["prefix"]
        },
        "junctions": {
          "package_name": ["model"]
        }
      },
      "_log": {
        "logPath": "./log",
        "logPrefix": "etl",
        "logLevel": "info"
      }
    };

    logger.info("writing sample config to " + configFilename);
    await fs.writeFile(configFilename, JSON.stringify(sampleConfig, null, " "), { encodign: 'utf-8', flag: 'wx' });
  }
  catch (err) {
    logger.warn(err.message);
  }

};

/**
 *
 */
exports.loadTracts = async (configFilename) => {
  let tracts;

  try {
    // read the app config file
    let appConfig = JSON.parse(await fs.readFile(configFilename, 'utf-8'));
    tracts = Object.assign({}, defaults, appConfig);

    logger.configETLLogger(tracts._log);

    // check tract properties
    for (let [name, tract] of Object.entries(tracts)) {
      if (name === "_log") continue;
      if (name === "_plugins") {
        loadPlugins(tracts["_plugins"]);
        continue;
      }

      if (typeof tract === "function")
        continue;
      // check origin properties
      if (typeof tract.origin !== "object")
        throw new Error("invalid tract origin: " + name);
      if (typeof tract.terminal !== "object")
        throw new Error("invalid tract terminal: " + name);
    }

  }
  catch (err) {
    logger.error(err.message);
  }

  return tracts;
};

async function loadPlugins(plugins) {

  // register filesystem plugins
  for (let [name, prefixes] of Object.entries(plugins["filesystems"])) {
    let stfs = require(name);
    for (let prefix of prefixes)
      storage.FileSystems.use(prefix, stfs);
  }

  // register junction plugins
  for (let [name, models] of Object.entries(plugins["junctions"])) {
    let junction = require(name);
    for (let model of models)
      storage.use(model, junction);
  }

}
