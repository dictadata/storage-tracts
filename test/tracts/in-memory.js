/**
 * test/tracts/tracts_in-memory
 *
 * Test Outline:
 *   Uses tracts with Memory Junction
 *   read tract(s) from file
 *   store tract definition(s) in tracts
 *   recall tract(s) from tracts storage
 *   compare results with expected tracts definitions
 */
"use strict";

const { Codex } = require("../../storage");
const { Tract } = require("../../storage/types");
const { logger } = require("../../storage/utils");
const _compare = require("../lib/_compare");

const fs = require('fs');
const path = require('path');

logger.info("=== Tests: tracts in-memory");

async function init() {
  let result = 0;
  try {
    // activate tracts
    let tracts = Codex.use("tract", "memory|dictadata|tracts|*");
    if (!await tracts.activate())
      result = 1;
  }
  catch (err) {
    logger.error(err);
    result = 1;
  }
  return result;
}

async function test(tract_name) {
  let retCode = 0;

  let tract;
  try {
    // store tract
    logger.verbose('=== store/recall ' + tract_name);
    tract = JSON.parse(fs.readFileSync("./test/data/input/tracts/" + tract_name + ".tracts.json", "utf8"));

    let results = await Codex.tracts.store(tract);
    logger.verbose(JSON.stringify(results, null, "  "));

    // recall tract
    let urn = tract.domain + ":" + tract.name;
    logger.verbose('--- ' + urn);
    results = await Codex.tracts.recall(urn);
    logger.verbose("recall: " + results.message);

    if (results.status === 0) {
      let outputfile = "./test/data/output/tracts/" + tract_name + ".tracts.json";
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

  if (await test("foo_transfer")) return 1;

  await Codex.tracts.relax();
})();
