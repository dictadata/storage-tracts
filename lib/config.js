/**
 * etl/config
 */
"use strict";

const logger = require('./logger');
const fs = require('fs');

var defaults = {
  "storage": {},
  "transforms": {},
  "log": {}
};

exports.load = function (configfile) {
  let config = {};

  try {
    // read the app config file
    let appConfig = JSON.parse(fs.readFileSync(configfile, 'utf-8'));
    config = Object.assign(this, defaults, appConfig);

    // check sources' properties
    for (let [name, store] of Object.entries(config.storage)) {
      if (typeof store.options !== "object")
        store.options = {};
      store.options["logger"] = logger;

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

  }
  catch (err) {
    logger.error(err);
    throw(err);
  }

  return config;
};
