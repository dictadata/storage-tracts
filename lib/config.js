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

exports.load = function (configfile) {
  let config = {};

  // read the app config file
  let appConfig = JSON.parse(fs.readFileSync(configfile, 'utf-8'));
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

    // check to load transform
    if (typeof store.transform === "string") {
      // name of transform file
      let transform = JSON.parse(fs.readFileSync(store.transform, 'utf-8'));
      store.transform = transform.transform || transform;
    }
  }

  return config;
};
