/**
 * storage/etl/config
 */
"use strict";

const Storage = require("../storage");
const { StorageError } = require("@dictadata/storage-junctions/types");
const { typeOf, logger, hasOwnProperty, objCopy } = require("@dictadata/storage-junctions/utils");
const Package = require('../../package.json');
const fs = require('fs');
const path = require('path');

module.exports.version = Package.version;

var configDefaults = {
  "_config": {
    "engrams": {
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
    "variables": {
      "name": "value"
    }
  }
};

/**
 *
 */
module.exports.sampleTracts = async function (tractsfile) {

  try {
    let sampleTracts = {
      "domain": "foo",
      "name": "tracts name",
      "type": "tract",
      "tracts": [
        {
          "name": "tract-name",
          "origin": {
            "smt": "<smt|urn>",
            "options": {}
          },
          "transforms": [
            {
              "transform": "filter"
            },
            {
              "transform": "select"
            }
          ],
          "terminal": {
            "smt": "json|./|foofile.json|*",
            "options": {
              "encoding": "<schema_name.encoding.json>"
            }
          }
        }
      ],
      "_config": {
        "engrams": {
          "smt": "<model>|<locus>|etl_engrams|*"
        },
        "tracts": {
          "smt": "<model>|<locus>|etl_tracts|*"
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

    logger.info("writing sample tracts configuration to " + tractsfile);
    await fs.writeFileSync(tractsfile, JSON.stringify(sampleTracts, null, " "), { encodign: 'utf-8', flag: 'wx' });
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
    let configFile;
    let errorMessage;

    try {
      let configText = await fs.readFileSync(appArgs.configFile, 'utf-8');
      configFile = JSON.parse(configText);
    }
    catch (err) {
      errorMessage = err.message;
    }

    // if URN
    // TBD could load config from a storage source

    // read the ETL tracts file
    let tractsText = fs.readFileSync(appArgs.tractsFile, 'utf-8');
    // simple text replacement of "${variables}" in ETL tracts file
    let variables = configFile?._config?.variables || {};
    for (let [ name, value ] of Object.entries(variables)) {
      var regex = new RegExp("\\${" + name + "}", "g");
      tractsText = tractsText.replace(regex, value);
    }
    tracts = JSON.parse(tractsText);

    // merge configs and initialize app
    let _config = Object.assign({}, configDefaults._config);
    if (configFile?._config)
      objCopy(_config, configFile?._config);
    if (tracts._config) {
      objCopy(_config, tracts._config);
      delete tracts._config;
    }

    await init(_config);

    if (hasOwnProperty(tracts, "tracts") && typeOf(tracts.tracts) === "array") {
      tracts = tracts.tracts
    }
    else {
      for (let [ name, tract ] of Object.entries(tracts))
        tract.name = name
      tracts = Object.values(tracts)
    }

    // validate tract properties
    for (let tract of tracts) {
      //if (typeof tract === "function")
      //  continue;

      if (tract.name === "engrams" || tract.action === "engrams")
        continue;
      if (tract.name === "tracts" || tract.action === "tracts" || tract.urn)
        continue;

      if (typeOf(tract.origin) !== "object")
        throw new StorageError(400, "invalid ETL tract origin: " + tract.name);

      if (tract.action !== "scan" && tract.action !== "iterate" && typeOf(tract.terminal) !== "object")
        throw new StorageError(400, "invalid ETL tract terminal: " + tract.name);
    }

  }
  catch (err) {
    logger.error(err.message);
  }

  return tracts;
};

/**
 *
 * @param {*} _config
 */
async function init(_config) {

  //// config logger
  logger.configLogger(_config.log);

  //// load auth_file
  if (_config.auth?.auth_file)
    Storage.auth.load(_config.auth.auth_file);

  //// engrams datastore initialization
  let engrams;
  if (_config.engrams?.smt) {
    logger.verbose("Engrams SMT: " + JSON.stringify(_config.engrams.smt, null, 2));
    engrams = await Storage.engrams.activate(_config.engrams.smt, _config.engrams.options);
  }
  else {
    logger.verbose("Engrams SMT: memory|dictadata|engrams|*");
    engrams = await Storage.engrams.activate("memory|dictadata|engrams|*");
  }

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
        Storage.Junctions.use(model, junction);
    }
  }

  //// tracts datastore initialization
  let tracts;
  if (_config.tracts?.smt) {
    logger.verbose("Tracts SMT: " + JSON.stringify(_config.tracts.smt, null, 2));
    tracts = await Storage.tracts.activate(_config.tracts.smt, _config.tracts.options);
  }
  else {
    logger.verbose("Tracts SMT: memory|dictadata|tracts|*");
    tracts = await Storage.tracts.activate("memory|dictadata|tracts|*");
  }
}
