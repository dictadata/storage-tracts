/**
 * etl/tracts
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const { StorageError } = require("@dictadata/storage-junctions/types");
const { typeOf, logger, hasOwnProperty } = require("@dictadata/storage-junctions/utils");

const Package = require('../../package.json');
const fs = require('fs');

exports.version = Package.version;

var defaults = {
  "_config": {
    "log": {
      logPath: "./log",
      logPrefix: "etl",
      logLevel: "info"
    },
    "plugins": {
      "filesystems": [],
      "junctions": []
    }
  }
};

/**
 *
 */
exports.createTracts = async function (tractsFilename) {

  try {
    let sampleTracts = {
      "tract-name": {
        "origin": {
          "smt": "csv|./|foofile.csv|*",
          "options": {
            "header": true,
            "encoding": {}
          }
        },
        "transform": {
          "filter": {},
          "select": {}
        },
        "terminal": {
          "smt": "json|./|foofile.json|*",
          "options": {
            "encoding": {},
            "append": false
          }
        }
      },
      "_congig": {
        "plugins": {
          "filesystems": {
            "package_name": [ "prefix" ]
          },
          "junctions": {
            "package_name": [ "model" ]
          }
        },
        "log": {
          "logPath": "./log",
          "logPrefix": "etl",
          "logLevel": "info"
        }
      }
    };

    logger.info("writing sample tracts configuration to " + tractsFilename);
    await fs.writeFileSync(tractsFilename, JSON.stringify(sampleTracts, null, " "), { encodign: 'utf-8', flag: 'wx' });
  }
  catch (err) {
    logger.warn(err.message);
  }

};

/**
 *
 */
exports.loadTracts = async (tractsFilename, schema) => {
  let tracts;

  try {
    // read the app configuration file
    let text = await fs.readFileSync(tractsFilename, 'utf-8');
    if (schema)
      text = text.replace(/\${schema}/g, schema);
    let appConfig = JSON.parse(text);
    tracts = Object.assign({}, defaults, appConfig);

    // check tract properties
    for (let [ name, tract ] of Object.entries(tracts)) {
      if (name === "_config") {
        loadConfig(tracts[ "_config" ]);
        continue;
      }

      if (typeof tract === "function")
        continue;
      // check origin properties
      if (typeOf(tract.origin) !== "object")
        throw new StorageError(400, "invalid tract origin: " + name);
      if (typeOf(tract.terminal) !== "object")
        throw new StorageError(400, "invalid tract terminal: " + name);
    }

  }
  catch (err) {
    logger.error(err.message);
  }

  return tracts;
};

async function loadConfig(_config) {

  let logOptions = Object.assign({}, defaults, _config.log);
  logger.configLogger(logOptions);

  let plugins = _config.plugins || {};

  // register filesystem plugins
  if (hasOwnProperty(plugins, "filesystems")) {
    for (let [ name, prefixes ] of Object.entries(plugins[ "filesystems" ])) {
      let stfs = require(name);
      for (let prefix of prefixes)
        storage.FileSystems.use(prefix, stfs);
    }
  }

  // register junction plugins
  if (hasOwnProperty(plugins, "junctions")) {
    for (let [ name, models ] of Object.entries(plugins[ "junctions" ])) {
      let junction = require(name);
      for (let model of models)
        storage.use(model, junction);
    }
  }

}
