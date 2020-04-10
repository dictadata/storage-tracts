/**
 * etl/config
 */
"use strict";

const logger = require('./logger');
const fs = require('fs');

var defaults = {
  "storage": {},
  "transforms": {},
  "log": {
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
      "storage": {
        "source-name": {
          "smt": "csv|./|foofile.csv|*",
          "options": {}
        },
        "destination-name": {
          "smt": "json|./|foofile.json|*",
          "options": {},
          "create": true
        }
      },
      "transforms": {
        "transform-name-1": {
          "filter": {},
          "select": {}
        },
        "transform-name-2": {
          "filter": {},
          "select": {}
        }
      },
      "log": {
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

    logger.configETLLogger(config.log);

    // check sources' properties
    for (let [name, store] of Object.entries(config.storage)) {
      if (typeof store !== "object") {
        throw new Error("invalid storage config: " + name);
      }

      if (typeof store.options !== "object")
        store.options = {};

      // check to load encoding
      if (typeof store.encoding === "string") {
        // name of encoding file
        let encoding = JSON.parse(fs.readFileSync(store.encoding, 'utf-8'));
        store.encoding = encoding.fields || encoding;
      }
    }

  }
  catch (err) {
    logger.warn(err.message);
  }

  return config;
};
