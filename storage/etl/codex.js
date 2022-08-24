/**
 * etl/codex
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const { Engram } = require("@dictadata/storage-junctions/types");
const output = require('./output');
const logger = require('./logger');

const fs = require('fs');

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("codex ...");
  let retCode = 0;
  let fn;

  try {
    for (let [ command, entry ] of Object.entries(tract)) {
      if (command === "action") continue;

      // determine function to apply
      switch (command) {
        case 'store': fn = store; break;
        case "dull": fn = dull; break;
        case "recall": fn = recall; break;
        case "retrieve": fn = retrieve; break;
        default:
          logger.error("unknown codex command: " + command);
          return 1;
      }

      // pass the entry(s) to the appropriate function
      if (Array.isArray(entry))
        for (let e of entry)
          retCode = fn(e);
      else
        retCode = fn(entry);

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
 * @param {*} entry a codex entry from an ETL tract
 */
async function store(entry) {
  let retCode = 0;

  try {
    if (entry.encoding && typeof entry.encoding === "string") {
      // read encoding from file
      let filename = entry.encoding;
      let encoding = JSON.parse(fs.readFileSync(filename, "utf8"));
      // merge encoding into entry
      delete entry.encoding;
      entry = Object.assign({}, encoding, entry);
    }

    let engram;
    switch (entry.type) {
      case "engram":
        engram = new Engram(entry);
        break;
      case "alias":
      case "tract":
        // need to do some type validation like Engram above
        engram = entry;
        break;
      default:
        throw new Error("invalid codex type");
    }

    // store codex entry
    let results = await Storage.codex.store(engram);
    logger.info("codex store: " + engram.name + " " + results.resultText);
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
}

/**
 *
 * @param {*} entry a codex entry from an ETL tract
 */
async function dull(entry) {
  let retCode = 0;
  let results = await Storage.codex.dull(entry.name);
  logger.info("codex dull: " + entry.name + " " + results.resultText);
  return retCode;
}

/**
 *
 * @param {*} entry a codex entry from an ETL tract
 */
async function recall(entry) {
  let retCode = 0;
  let results = await Storage.codex.recall(entry.name);
  logger.verbose("codex recall: " + entry.name + " " + results.resultText);

  retCode = output(entry.output, results.data);
  return retCode;
}

/**
 *
 * @param {*} entry a codex entry from an ETL tract
 */
async function retrieve(entry) {
  let retCode = 0;
  let results = await Storage.codex.retrieve(entry.pattern);
  logger.verbose("codex retrieve: " + entry.name + " " + results.resultText);

  retCode = output(entry.output, results.data);
  return retCode;
}
