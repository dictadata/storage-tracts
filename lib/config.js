/**
 * etl/config
 */
"use strict";

const logger = require('./logger');
const fs = require('fs');

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
      "_log": {
        "logPath": "./log",
        "logPrefix": "etl",
        "logLevel": "info"
      }
    };

    logger.info("writing sample config to ./etl_config.json");
    fs.writeFileSync("./etl_config.json", JSON.stringify(sampleConfig, null, " "), { encodign: 'utf-8', flag: 'wx' });
  }
  catch (err) {
    logger.warn(err.message);
  }

};

/**
 *
 */
exports.load = function (configFilename) {
  let config = {};

  try {
    // read the app config file
    let appConfig = JSON.parse(fs.readFileSync(configFilename, 'utf-8'));
    config = Object.assign(this, defaults, appConfig);

    logger.configETLLogger(config._log);

    // check origin properties
    for (let [name, tract] of Object.entries(config)) {
      if (name === "_log") continue;
      if (typeof tract === "function") continue;
      if (typeof tract.origin !== "object") {
        throw new Error("invalid tract config: " + name);
      }
    }

  }
  catch (err) {
    logger.error(err.message);
  }

  return config;
};
