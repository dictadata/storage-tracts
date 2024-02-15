/**
 * storage/etl/engrams
 */
"use strict";

const Storage = require("../storage");
const { Engram } = require("../types");
const output = require('./output');
const { logger } = require('../utils');

const fs = require('fs');

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("engrams ...");
  let retCode = 0;
  let fn;

  try {
    for (let [ command, request ] of Object.entries(tract)) {
      if (command === "action" || command === "name") continue;

      // determine function to apply
      switch (command) {
        case 'store': fn = store; break;
        case "dull": fn = dull; break;
        case "recall": fn = recall; break;
        case "retrieve": fn = retrieve; break;
        default:
          logger.error("unknown engrams command: " + command);
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
 * @param {Object} entry ETL engrams tract that is a Engrams entry
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
        engram = new Engram(entry).encoding;
        results = await Storage.engrams.store(engram);
        break;
      case "alias":
        results = await Storage.engrams.store(entry);
        break;
      default:
        throw new Error("invalid engrams type");
    }

    logger.info("engrams store: " + entry.type + " " + entry.name + " " + results.message);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}

/**
 *
 * @param {Object} request ETL engrams tract
 * @param {String|Object} request.urn engrams URN string or object
 */
async function dull(request) {
  let retCode = 0;

  try {
    let results = await Storage.engrams.dull(request.urn);

    logger.info("engrams dull: " + request.urn + " " + results.message);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}

/**
 *
 * @param {Object} request ETL engrams tract
 * @param {String|Object} request.urn engrams URN string or object
 * @param {Boolean} request.resolve resolve aliases
 */
async function recall(request) {
  let retCode = 0;

  try {
    let results = await Storage.engrams.recall(request.urn, request.resolve);
    logger.verbose("engrams recall: " + request.urn + " " + results.message);

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
 * @param {Object} request ETL engrams tract with query pattern
 * @param {Object} request.pattern query pattern
 */
async function retrieve(request) {
  let retCode = 0;

  try {
    let pattern = request.pattern || request;
    let results = await Storage.engrams.retrieve(pattern);
    logger.verbose("engrams retrieve: " + results.message);

    retCode = output(request.output, results.data);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}