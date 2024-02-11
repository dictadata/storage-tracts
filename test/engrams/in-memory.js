/**
 * test/engrams/engrams_in-memory
 *
 * Test Outline:
 *   Uses engrams with Memory Junction
 *   read encoding(s) from file
 *   store engram definition(s) in engrams
 *   recall engram(s) from engrams
 *   compare results with expected SMT engram definitions
 */
"use strict";

const { Engrams } = require("../../storage");
const { Engram } = require("../../storage/types");
const { logger } = require("../../storage/utils");
const _compare = require("../lib/_compare");

const fs = require('fs');
const path = require('path');

logger.info("=== Tests: engrams in-memory");

async function init() {
  let result = 0;
  try {
    // activate engrams
    let engrams = Engrams.use("engram", "memory|dictadata|engrams_engrams|*");
    if (!await engrams.activate())
      result = 1;
  }
  catch (err) {
    logger.error(err);
    result = 1;
  }
  return result;
}

async function test(schema) {
  let retCode = 0;

  let encoding;
  try {
    // store encoding
    logger.verbose('=== store/recall ' + schema);
    encoding = JSON.parse(fs.readFileSync("./test/data/input/encodings/" + schema + ".encoding.json", "utf8"));
    encoding.name = schema;

    let entry = new Engram(encoding);
    let results = await Engrams.engrams.store(entry);
    logger.verbose(JSON.stringify(results, null, "  "));

    // recall encoding
    let urn = entry.urn;
    results = await Engrams.engrams.recall({ type: "engram", key: urn });
    logger.verbose("recall: " + results.message);

    if (results.status === 0) {
      //encoding = results.data[ urn ];

      let outputfile = "./test/data/output/engrams/" + schema + ".encoding.json";
      logger.verbose("output file: " + outputfile);
      fs.mkdirSync(path.dirname(outputfile), { recursive: true });
      fs.writeFileSync(outputfile, JSON.stringify(results, null, 2), "utf8");

      // compare to expected output
      let expected_output = outputfile.replace("output", "expected");
      retCode = _compare(expected_output, outputfile, 2);
    }
    else
      retCode = results.status;
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return process.exitCode = retCode;
}

(async () => {
  if (await init()) return 1;

  if (await test("foo_schema")) return 1;
  if (await test("foo_schema_short")) return 1;
  if (await test("foo_schema_typesonly")) return 1;

  await Engrams.engrams.relax();
})();
