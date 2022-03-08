/**
 * etl/cortex
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const { Engram } = require("@dictadata/storage-junctions/types");
const logger = require('./logger');

const fs = require('fs');
const path = require('path');

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("cortex ...");
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
          logger.error("unknown cortex command: " + command);
          return 1;
      }

      // pass the entry(s) to the appropriate function
      if (Array.isArray(entry))
        for (let e of entry)
          fn(e);
      else
        fn(entry);
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
 * @param {*} entry a cortex entry from an ETL tract
 */
async function store(entry) {
  let engram = new Engram(entry.smt);
  engram.name = entry.name;

  if (entry.encoding && typeof entry.encoding === "string") {
    // read encoding from file
    let filename = entry.encoding;
    engram.encoding = JSON.parse(fs.readFileSync(filename, "utf8"));
  }
  else
    engram.encoding = entry.encoding;

  // store cortex entry
  let results = await storage.cortex.store(engram);
  console.log(results.resultText);
}

/**
 *
 * @param {*} entry a cortex entry from an ETL tract
 */
async function dull(entry) {
  let results = await storage.cortex.dull(entry.name);
  logger.info(results.resultText);
}

/**
 *
 * @param {*} entry a cortex entry from an ETL tract
 */
async function recall(entry) {
  let results = await storage.cortex.recall(entry.name);
  console.log(results.resultText);

  logger.verbose("output file: " + entry.output);
  fs.mkdirSync(path.dirname(entry.output), { recursive: true });
  fs.writeFileSync(entry.output, JSON.stringify(results.data, null, 2), "utf8");
}

/**
 *
 * @param {*} entry a cortex entry from an ETL tract
 */
async function retrieve(entry) {
  let results = await storage.cortex.retrieve(entry.pattern);
  console.log(results.resultText);

  logger.verbose("output file: " + entry.output);
  fs.mkdirSync(path.dirname(entry.output), { recursive: true });
  fs.writeFileSync(entry.output, JSON.stringify(results.data, null, 2), "utf8");
}
