/**
 * etl/codex
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

  // store codex entry
  let results = await storage.codex.store(engram.encoding);
  console.log(results.resultText);
}

async function dull(entry) {
  let results = await storage.codex.dull(entry.name);
  logger.info(results.resultText);
}

async function recall(entry) {
  let results = await storage.codex.recall(entry.name);
  console.log(results.resultText);

  logger.verbose("output file: " + entry.output);
  fs.mkdirSync(path.dirname(entry.output), { recursive: true });
  fs.writeFileSync(entry.output, JSON.stringify(results.data, null, 2), "utf8");
}

async function retrieve(entry) {
  let results = await storage.codex.retrieve(entry.pattern);
  console.log(results.resultText);

  logger.verbose("output file: " + entry.output);
  fs.mkdirSync(path.dirname(entry.output), { recursive: true });
  fs.writeFileSync(entry.output, JSON.stringify(results.data, null, 2), "utf8");
}
