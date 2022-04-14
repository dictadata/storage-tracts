/**
 * etl/codex
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const { Engram } = require("@dictadata/storage-junctions/types");
const logger = require('./logger');

const fs = require('fs');
const path = require('path');

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
 * @param {*} entry a codex entry from an ETL tract
 */
async function store(entry) {
  let engram = new Engram(entry.smt);

  if (entry.encoding && typeof entry.encoding === "string") {
    // read encoding from file
    let filename = entry.encoding;
    engram.encoding = JSON.parse(fs.readFileSync(filename, "utf8"));
  }
  else
    engram.encoding = entry.encoding;

  // properties in tract take precedence over encoding file
  // except for predominant Engram properties
  for (const [ key, value ] of Object.entries(entry)) {
    if (![ "smt", "encoding", "fields", "fieldsMap" ].includes(key)) {
      engram[ key ] = value;
    }
  }

  // store codex entry
  let results = await Storage.codex.store(engram);
  console.log(results.resultText);
}

/**
 *
 * @param {*} entry a codex entry from an ETL tract
 */
async function dull(entry) {
  let results = await Storage.codex.dull(entry.name);
  logger.info(results.resultText);
}

/**
 *
 * @param {*} entry a codex entry from an ETL tract
 */
async function recall(entry) {
  let results = await Storage.codex.recall(entry.name);
  console.log(results.resultText);

  logger.verbose("output file: " + entry.output);
  fs.mkdirSync(path.dirname(entry.output), { recursive: true });
  fs.writeFileSync(entry.output, JSON.stringify(results.data, null, 2), "utf8");
}

/**
 *
 * @param {*} entry a codex entry from an ETL tract
 */
async function retrieve(entry) {
  let results = await Storage.codex.retrieve(entry.pattern);
  console.log(results.resultText);

  logger.verbose("output file: " + entry.output);
  fs.mkdirSync(path.dirname(entry.output), { recursive: true });
  fs.writeFileSync(entry.output, JSON.stringify(results.data, null, 2), "utf8");
}
