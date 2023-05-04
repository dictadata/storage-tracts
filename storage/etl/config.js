/**
 * storage/etl/config
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const { StorageError } = require("@dictadata/storage-junctions/types");
const { typeOf, logger, hasOwnProperty } = require("@dictadata/storage-junctions/utils");

const Package = require('../../package.json');
const fs = require('fs');
const path = require('path');

module.exports.version = Package.version;

var configDefaults = {
  "_config": {
    "codex": {
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
    },
    "variables": {}
  }
};

/**
 *
 */
module.exports.sampleTracts = async function (etlTracts) {

  try {
    let sampleTracts = {
      "tract-name": {
        "origin": {
          "smt": "<smt|urn>",
          "options": {}
        },
        "transform": {
          "filter": {},
          "select": {}
        },
        "terminal": {
          "smt": "json|./|foofile.json|*",
          "options": {
            "encoding": "<schema_name.encoding.json>"
          }
        }
      },
      "_config": {
        "codex": {
          "smt": "<model>|<locus>|dicta_codex|*"
        },
        "tracts": {
          "smt": "<model>|<locus>|dicta_tracts|*"
        },
        "plugins": {
          "filesystems": {
            "<package_name>": [ "<prefix>" ]
          },
          "junctions": {
            "<package_name>": [ "<model>" ]
          }
        },
        "log": {
          "logPath": "./log",
          "logPrefix": "etl",
          "logLevel": "info"
        },
        "variables": {
          "var1": "value1"
        }
      }
    };

    logger.info("writing sample tracts configuration to " + etlTracts);
    await fs.writeFileSync(etlTracts, JSON.stringify(sampleTracts, null, " "), { encodign: 'utf-8', flag: 'wx' });
  }
  catch (err) {
    logger.warn(err.message);
  }

};

/**
 *
 */
module.exports.loadETLTracts = async (appArgs) => {
  let etl_tracts;

  try {
    // check for config file
    let configFile;
    let errorMessage;

    try {
      let configText = await fs.readFileSync(appArgs.configFile, 'utf-8');
      configFile = JSON.parse(configText);
    }
    catch (err) {
      errorMessage = err.message;
    }

    // read the ETL tracts file
    let tractsText = fs.readFileSync(appArgs.etlTracts, 'utf-8');
    // simple text replacement of "${variables}" in ETL tracts file
    let variables = configFile?._config?.variables || {};
    for (let [ name, value ] of Object.entries(variables)) {
      var regex = new RegExp("\\${" + name + "}", "g");
      tractsText = tractsText.replace(regex, value);
    }
    etl_tracts = JSON.parse(tractsText);

    // merge configs and initialize app
    let _config = Object.assign({}, configDefaults._config);
    if (configFile?._config)
      _merge(_config, configFile?._config);
    if (etl_tracts._config) {
      _merge(_config, etl_tracts._config);
      delete etl_tracts._config;
    }
    await init(_config);

    // validate tract properties
    for (let [ name, tract ] of Object.entries(etl_tracts)) {
      //if (typeof tract === "function")
      //  continue;

      if (name === "codex" || tract.action === "codex")
        continue;
      if (name === "tracts" || tract.action === "tracts" || tract.urn)
        continue;

      if (typeOf(tract.origin) !== "object")
        throw new StorageError(400, "invalid ETL tract origin: " + name);

      if (tract.action !== "scan" && tract.action !== "iterate" && typeOf(tract.terminal) !== "object")
        throw new StorageError(400, "invalid ETL tract terminal: " + name);
    }

  }
  catch (err) {
    logger.error(err.message);
  }

  return etl_tracts;
};

async function init(_config) {

  //// config logger
  logger.configLogger(_config.log);

  //// load auth_stash
  if (_config.codex.auth_stash)
    Storage.authStash.load(_config.codex.auth_stash);

  //// codex datastore initialization
  let codex;
  if (_config.codex?.smt) {
    logger.verbose("Codex SMT: " + JSON.stringify(_config.codex.smt, null, 2));
    // activate codex junction
    codex = new Storage.Codex(_config.codex.smt, _config.codex.options);
    await codex.activate();
  }
  else {
    logger.verbose("Codex SMT: memory|dictadata|codex|*");
    codex = new Storage.Codex("memory|dictadata|codex|*");
  }
  // make codex available "globally" and use for SMT urn lookups
  Storage.codex = codex;

  //// register plugins
  let plugins = _config.plugins || {};

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
        Storage.use(model, junction);
    }
  }

  //// tracts datastore initialization
  let tracts_store;
  if (_config.tracts?.smt) {
    logger.verbose("Tracts SMT: " + JSON.stringify(_config.tracts.smt, null, 2));
    // activate tracts junction
    tracts_store = new Storage.Tracts(_config.tracts.smt, _config.tracts.options);
    await tracts_store.activate();
  }
  else {
    logger.verbose("Tracts SMT: memory|dictadata|tracts|*");
    tracts_store = new Storage.Tracts("memory|dictadata|tracts|*");
  }
  // make tracts available "globally"
  Storage.tracts = tracts_store;
}

/**
 * Copy src properties to dst object.
 * Deep copy of object properties and top level arrays.
 * Shallow copy of reference types like Date, sub-arrays, etc.
 * Does not copy functions.
 * Note, this is a recursive function.
 * @param {object} dst
 * @param {object} src
 */
function _merge(dst, src) {
  for (let [ key, value ] of Object.entries(src)) {
    if (typeOf(value) === "object") {
      if (typeOf(dst[ key ] !== "object"))
        dst[ key ] = {};
      _merge(dst[ key ], value);
    }
    else if (typeOf(value) === "array") {
      if (typeOf(dst[ key ] !== "array"))
        dst[ key ] = [];
      for (let item of value)
        if (typeOf(item) === "object")
          dst[ key ].push(_merge({}, item));
        else
          dst[ key ].push(item);
    }
    else /* if (typeOf(value) !== "function") */ {
      dst[ key ] = value;
    }
  }
  return dst;
}

module.exports._merge = _merge;
