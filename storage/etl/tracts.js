/**
 * storage/etl/tracts
 */
"use strict";

const { Codex } = require("@dictadata/storage-junctions");
const { Tract } = require("@dictadata/storage-junctions/types");
const output = require('./output');
const logger = require('./logger');

const fs = require('fs');

/**
 *
 */
module.exports = async (etl_tract) => {
  logger.verbose("tracts ...");
  let retCode = 0;
  let fn;

  try {
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
          logger.error("unknown tracts command: " + command);
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
    // activate tracts
    let tracts = Codex.use("tract", request.smt, request.options);
    await tracts.activate();
    logger.info("codex tracts config: " + JSON.stringify(request.smt));
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}

/**
 *
 * @param {Object} entry request section of ETL tract that is a Tracts entry
 */
async function store(entry) {
  let retCode = 0;

  // store tracts entry
  try {
    if (typeof entry?.tracts === "string") {
      // read tracts from file
      let filename = entry.tracts;
      let tracts = JSON.parse(fs.readFileSync(filename, "utf8"));
      // merge tracts into entry
      delete entry.tracts;
      entry = Object.assign({}, tracts, entry);
    }

    let results = await Codex.tracts.store(entry);
    logger.info("tracts store: " + entry.name + " " + results.message);
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
    let results = await Codex.tracts.dull(pattern);

    logger.info("tracts dull: " + (pattern.key || pattern.name) + " " + results.message);
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
    let results = await Codex.tracts.recall(pattern);
    logger.verbose("tracts recall: " + (pattern.key || pattern.name) + " " + results.message);

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
    let results = await Codex.tracts.retrieve(pattern);
    logger.verbose("tracts retrieve: " + results.message);

    retCode = output(request.output, results.data);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}
