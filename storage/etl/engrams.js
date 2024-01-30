/**
 * storage/etl/codex
 */
"use strict";

const { Codex } = require("@dictadata/storage-junctions");
const { Engram } = require("@dictadata/storage-junctions/types");
const output = require('./output');
const logger = require('./logger');

const fs = require('fs');

/**
 *
 */
module.exports = async (etl_tract) => {
  logger.verbose("codex ...");
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
          logger.error("unknown codex command: " + command);
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
    // activate codex
    let engrams = await Codex.use("engram", request.smt, request.options);
    await engrams.activate();
    logger.info("codex engrams config: " + JSON.stringify(request.smt));
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}

/**
 *
 * @param {Object} entry request section of ETL tract that is a Codex entry
 */
async function store(entry) {
  let retCode = 0;

  try {
    if (typeof entry?.encoding === "string") {
      // read encoding from file
      let filename = entry.encoding;
      let encoding = JSON.parse(fs.readFileSync(filename, "utf8"));
      // merge encoding into entry
      delete entry.encoding;
      entry = Object.assign({}, encoding, entry);
    }

    let results;
    let engram;
    switch (entry.type) {
      case "engram":
        engram = new Engram(entry);
        results = await Codex.engrams.store(engram);
        break;
      case "alias":
        results = await Codex.engrams.store(entry);
        break;
      default:
        throw new Error("invalid codex type");
    }

    logger.info("codex store: " + engram.name + " " + results.message);
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
    let results = await Codex.engrams.dull(pattern);

    logger.info("codex dull: " + (pattern.key || pattern.name) + " " + results.message);
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
    let results = await Codex.engrams.recall(pattern);
    logger.verbose("codex recall: " + (pattern.key || pattern.name) + " " + results.message);

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
    let results = await Codex.engrams.retrieve(pattern);
    logger.verbose("codex retrieve: " + results.message);

    retCode = output(request.output, results.data);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}
