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
exports.sampleTracts = async function (tractsFilename) {

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
      "_congig": {
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
exports.loadTracts = async (tractsFilename, schema) => {
  let tracts;

  try {
    // check for config file
    let cfgTracts = {};
    try {
      let cfg = await fs.readFileSync("storage-etl.config.json", 'utf-8');
      cfgTracts = JSON.parse(cfg);
    }
    catch (err) {
      console.verbose(err.message);
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
      _copy(config, cfgTracts._config);
    if (appTracts._config)
      _copy(config, appTracts._config);
    await initConfig(config);

    tracts = Object.assign({}, cfgTracts, appTracts);
    delete tracts._config;

    // check tract properties
    for (let [ name, tract ] of Object.entries(tracts)) {
      //if (typeof tract === "function")
      //  continue;

      if (name === "codex") continue;

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

async function initConfig(_config) {

  //// config logger
  logger.configLogger(_config.log);

  ///// codex initialization
  if (hasOwnProperty(_config, "codex") && _config.codex.smt) {
    // activate codex junction
    let codex = new storage.Codex(_config.codex);
    await codex.activate();

    // use codex for SMT name lookup
    storage.codex = codex;
  }

  //// register any plugins
  let plugins = _config.plugins || {};

  // filesystem plugins
  if (hasOwnProperty(plugins, "filesystems")) {
    for (let [ name, prefixes ] of Object.entries(plugins[ "filesystems" ])) {
      let stfs = require(name);
      for (let prefix of prefixes)
        storage.FileSystems.use(prefix, stfs);
    }
  }

  // junction plugins
  if (hasOwnProperty(plugins, "junctions")) {
    for (let [ name, models ] of Object.entries(plugins[ "junctions" ])) {
      let junction = require(name);
      for (let model of models)
        storage.use(model, junction);
    }
  }

}

/**
 * Copy all src properties to dst object.
 * Deep copy of object properties and top level arrays.
 * Shallow copy of reference types like Date, sub-arrays, etc.
 * Does not copy functions.
 * Note, recursive function.
 * @param {object} dst
 * @param {object} src
 */
function _copy(dst, src) {
  for (let [ key, value ] of Object.entries(src)) {
    if (typeOf(value) === "object") { // fields, ...
      dst[ key ] = {};
      _copy(dst[ key ], value);
    }
    else if (typeOf(value) === "array") {
      dst[ key ] = [];
      for (let item of value)
        if (typeOf(item) === "object")
          dst[ key ].push(_copy({}, item));
        else
          dst[ key ].push(item);
    }
    else if (typeOf(value) !== "function") {
      dst[ key ] = value;
    }
  }
  return dst;
}
