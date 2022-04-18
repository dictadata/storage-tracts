/**
 * etl/tracts
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const { StorageError } = require("@dictadata/storage-junctions/types");
const { typeOf, logger, hasOwnProperty } = require("@dictadata/storage-junctions/utils");

const Package = require('../../package.json');
const fs = require('fs');

module.exports.version = Package.version;

var defaultTracts = {
  "_config": {
    "codex": {
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
  }
};

/**
 *
 */
module.exports.sampleTracts = async function (tractsFilename) {

  try {
    let sampleTracts = {
      "tract-name": {
        "origin": {
          "smt": "<SMT_name>",
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
          "smt": "<model>|<locus>|<schema>|<key>"
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
module.exports.loadTracts = async (tractsFilename, schema) => {
  let tracts;

  try {
    // check for config file
    let cfgTracts = {};
    try {
      let cfg = await fs.readFileSync("storage-etl.config.json", 'utf-8');
      cfgTracts = JSON.parse(cfg);
    }
    catch (err) {
      console.log(err.message);
    }

    // read the app tracts file
    let text = fs.readFileSync(tractsFilename, 'utf-8');
    if (schema) {
      // simple text replacement of "${schema}" in tracts file
      text = text.replace(/\${schema}/g, schema);
    }
    let appTracts = JSON.parse(text);

    let config = Object.assign({}, defaultTracts._config);
    if (cfgTracts._config)
      _merge(config, cfgTracts._config);
    if (appTracts._config)
      _merge(config, appTracts._config);
    await initConfig(config);

    tracts = Object.assign({}, cfgTracts, appTracts);
    delete tracts._config;

    // check tract properties
    for (let [ name, tract ] of Object.entries(tracts)) {
      //if (typeof tract === "function")
      //  continue;

      // validate tract properties
      if (name === "codex") continue;
      if (typeOf(tract.origin) !== "object")
        throw new StorageError(400, "invalid tract origin: " + name);
      if (tract.action !== "scan" && typeOf(tract.terminal) !== "object")
        throw new StorageError(400, "invalid tract terminal: " + name);
    }

  }
  catch (err) {
    logger.error(err.message);
  }

  return tracts;
};

async function initConfig(_config) {

  //// config logger
  logger.configLogger(_config.log);

  ///// codex initialization
  let codex;
  if (hasOwnProperty(_config, "codex") && _config.codex.smt) {
    // activate codex junction
    codex = new Storage.Codex(_config.codex);
    await codex.activate();
  }
  else
    codex = new Storage.Codex("memory|dictadata|codex|!name");

  // use codex for SMT name lookup
  Storage.codex = codex;

  //// register any plugins
  let plugins = _config.plugins || {};

  // filesystem plugins
  if (hasOwnProperty(plugins, "filesystems")) {
    for (let [ name, prefixes ] of Object.entries(plugins[ "filesystems" ])) {
      let stfs = require(name);
      for (let prefix of prefixes)
        Storage.FileSystems.use(prefix, stfs);
    }
  }

  // junction plugins
  if (hasOwnProperty(plugins, "junctions")) {
    for (let [ name, models ] of Object.entries(plugins[ "junctions" ])) {
      let junction = require(name);
      for (let model of models)
        Storage.use(model, junction);
    }
  }

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
