/**
 * storage/etl/tracts
 *
 * Manage tract definitions on storage-node server.
 */
"use strict";

const Storage = require('../storage');
const { Tract } = require('../types');
const { logger } = require('@dictadata/lib');
const { objCopy } = require('@dictadata/lib');
const { output } = require('@dictadata/lib/test');;

const { readFile } = require('node:fs/promises');

/**
 * Manage tract definitions on storage-node server.
 *
 * @param {Object} fiber
 * @param {String} fiber.action always equals "engrams"
 * @param {Object|String} fiber.store a tract or name of file containing tract definition
 * @param {Object} fiber.dull
 * @param {String} fiber.dull.urn
 * @param {Object} fiber.recall
 * @param {String} fiber.recall.urn
 * @param {Ojbect} fiber.retrieve
 * @param {Ojbect} fiber.retrieve.pattern
 * @returns {Number} return code with 0 = success, non-zero = error
 */
module.exports = exports = async function tracts(fiber) {
  logger.verbose("tracts ...");
  let retCode = 0;
  let fn;

  try {
    for (let [ command, request ] of Object.entries(fiber)) {
      if (command === "action" || command === "name") continue;

      // determine function to apply
      switch (command) {
        case 'store': fn = store; break;
        case "dull": fn = dull; break;
        case "recall": fn = recall; break;
        case "retrieve": fn = retrieve; break;
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
 * @param {Object} entry ETL tracts entry
 */
async function store(entry) {
  let retCode = 0;

  // store tracts entry
  try {
    if (typeof entry?.tract === "string") {
      // read tracts from file
      let filename = entry.tract;
      let tract = JSON.parse(await readFile(filename, "utf8"));
      // merge tracts into entry
      delete entry.tract;
      entry = objCopy({}, tract, entry);
    }

    let results = await Storage.tracts.store(entry);
    logger.info("tracts store: " + entry.name + " " + results.message);
    if (results.status !== 0)
      retCode = 1;
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}

/**
 *
 * @param {Object} request ETL tracts entry
 * @param {String|Object} request.urn tracts URN string or object
 */
async function dull(request) {
  let retCode = 0;

  try {
    let results = await Storage.tracts.dull(request.urn);

    logger.info("tracts dull: " + request.urn + " " + results.message);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}

/**
 *
 * @param {Object} request ETL tracts entry
 * @param {String|Object} request.urn tracts URN string or object
 * @param {Boolean} request.resolve resolve aliases
 */
async function recall(request) {
  let retCode = 0;

  try {
    let results = await Storage.tracts.recall(request.urn, request.resolve);
    logger.verbose("tracts recall: " + request.urn + " " + results.message);

    retCode = output(request.output, results.data, request.compareValues);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}

/**
 *
 * @param {Object} request ETL tracts entry with query pattern
 * @param {Object} request.pattern query pattern
 */
async function retrieve(request) {
  let retCode = 0;

  try {
    let pattern = request.pattern || request;
    let results = await Storage.tracts.retrieve(pattern);
    logger.verbose("tracts retrieve: " + results.message);

    retCode = output(request.output, results.data, request.compareValues);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}
