/**
 * storage/etl/tracts
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
module.exports.sampleTracts = async function (tractsFile) {

  try {
    let sampleTracts = {
      "tract-name": {
        "origin": {
          "smt": "<smt_urn>",
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
        },
        "variables": {
          "var1": "value1"
        }
      }
    };

    logger.info("writing sample tracts configuration to " + tractsFile);
    await fs.writeFileSync(tractsFile, JSON.stringify(sampleTracts, null, " "), { encodign: 'utf-8', flag: 'wx' });
  }
  catch (err) {
    logger.warn(err.message);
  }

};

/**
 *
 */
module.exports.loadTracts = async (appArgs) => {
  let tracts;

  try {
    // check for config file
    let configFile = {};
    try {
      let configText = await fs.readFileSync(appArgs.configFile, 'utf-8');
      configFile = JSON.parse(configText);
    }
    catch (err) {
      console.log(err.message);
    }

    // read the app tracts file
    let tractsText = fs.readFileSync(appArgs.tractsFile, 'utf-8');
    // simple text replacement of "${variables}" in tracts file
    for (let [ name, value ] of Object.entries(configFile._config.variables)) {
      var regex = new RegExp("\\${" + name + "}", "g");
      tractsText = tractsText.replace(regex, value);
    }
    tracts = JSON.parse(tractsText);

    // merge configs and initialize app
    let _config = Object.assign({}, configDefaults._config);
    if (configFile._config)
      _merge(_config, configFile._config);
    if (tracts._config) {
      _merge(_config, tracts._config);
      delete tracts._config;
    }
    await init(_config);

    // validate tract properties
    for (let [ name, tract ] of Object.entries(tracts)) {
      //if (typeof tract === "function")
      //  continue;

      if (name === "codex" || tract.action === "codex") continue;
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

async function init(_config) {

  //// config logger
  logger.configLogger(_config.log);

  //// load auth_stash
  if (_config.codex.auth_stash)
    Storage.authStash.load(_config.codex.auth_stash);

  //// codex initialization
  let codex;
  if (hasOwnProperty(_config, "codex") && _config.codex.smt) {
    logger.verbose("Codex SMT: " + JSON.stringify(_config.codex.smt, null, 2));
    // activate codex junction
    codex = new Storage.Codex(_config.codex.smt, _config.codex.options);
    await codex.activate();
  }
  else {
    logger.verbose("Codex SMT: memory|dictadata|codex|*");
    codex = new Storage.Codex("memory|dictadata|codex|*");
  }

  // use codex for SMT name lookup
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
