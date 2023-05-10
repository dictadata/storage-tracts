/**
 * storage/etl/cortex
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const output = require('./output');
const logger = require('./logger');

const fs = require('fs');

var _cortex;

/**
 *
 */
module.exports = async (etl_tract) => {
  logger.verbose("cortex ...");
  let retCode = 0;
  let fn;

  try {
    _cortex = Storage.cortex;

    for (let [ command, request ] of Object.entries(etl_tract)) {
      if (command === "action") continue;

      // determine function to apply
      switch (command) {
        case 'store': fn = store; break;
        case "dull": fn = dull; break;
        case "recall": fn = recall; break;
        case "retrieve": fn = retrieve; break;
        case "config":
        case '_config': fn = config; break;
        default:
          logger.error("unknown cortex command: " + command);
          return 1;
      }

      // pass entry(s) to the appropriate function
      if (Array.isArray(request))
        for (let req of request)
          retCode = await fn(req);
      else
        retCode = await fn(request);

      if (retCode != 0)
        break;
    }
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
};

/**
 *
 * @param {Object} request section of ETL tract with a pattern property
 */
async function config(request) {
  let retCode = 0;

  try {
    // activate cortex
    var cortex = new Storage.Cortex(request.smt, request.options);
    await cortex.activate();
    _cortex = cortex;

    logger.info("cortex config: " + JSON.stringify(request.smt));
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}

/**
 *
 * @param {Object} entry request section of ETL tract that is a Cortex entry
 */
async function store(entry) {
  let retCode = 0;

  // store cortex entry
  try {
    if (typeof entry?.tracts === "string") {
      // read cortex from file
      let filename = entry.tracts;
      let tracts = JSON.parse(fs.readFileSync(filename, "utf8"));
      // merge tracts into entry
      delete entry.tracts;
      entry = Object.assign({}, tracts, entry);
    }

    let results = await _cortex.store(entry);
    logger.info("cortex store: " + entry.name + " " + results.message);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}

/**
 *
 * @param {Object} request section of ETL tract with a pattern property
 */
async function dull(request) {
  let retCode = 0;

  try {
    let pattern = request.pattern || request;
    let results = await _cortex.dull(pattern);

    logger.info("cortex dull: " + (pattern.key || pattern.name) + " " + results.message);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}

/**
 *
 * @param {Object} request section of ETL tract with a pattern property
 */
async function recall(request) {
  let retCode = 0;

  try {
    let pattern = request.pattern || request;
    let results = await _cortex.recall(pattern);
    logger.verbose("cortex recall: " + (pattern.key || pattern.name) + " " + results.message);

    retCode = output(request.output, results.data);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}

/**
 *
 * @param {Object} request section of ETL tract with a pattern property
 */
async function retrieve(request) {
  let retCode = 0;

  try {
    let pattern = request.pattern || request;
    let results = await _cortex.retrieve(pattern);
    logger.verbose("cortex retrieve: " + results.message);

    retCode = output(request.output, results.data);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}
