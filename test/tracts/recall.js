/**
 * test/tracts/recall
 *
 * Test Outline:
 *   use tracts with Elasticsearch junction
 *   recall tract definition for foo_transfer
 *   compare results to expected foo_transfer definition
 */
"use strict";

const { Codex } = require("../../storage");
const { logger } = require("../../storage/utils");
const _compare = require("../lib/_compare");

const fs = require('fs');
const path = require('path');

logger.info("=== Tests: tracts recall");

async function init() {
  let result = 0;
  try {
    // activate tracts
    let tracts = Codex.use("tract", "elasticsearch|http://dev.dictadata.net:9200/|storage_tracts|*");
    if (!await tracts.activate())
      result = 1;
  }
  catch (err) {
    logger.error(err);
    result = 1;
  }
  return result;
}

async function test(domain, tract_name, resolve = false) {
  let retCode = 0;

  try {
    logger.verbose('=== recall ' + tract_name);

    // recall tract definition
    let results = await Codex.tracts.recall({ domain: domain, name: tract_name, resolve });
    logger.verbose(JSON.stringify(results, null, "  "));

    if (results.status !== 0) {
      retCode = results.status;
    }
    else {
      let outputfile = "./test/data/output/tracts/" + (resolve ? "resolve_" : "recall_") + tract_name + ".tracts.json";
      logger.verbose("output file: " + outputfile);
      fs.mkdirSync(path.dirname(outputfile), { recursive: true });
      fs.writeFileSync(outputfile, JSON.stringify(results, null, 2), "utf8");

      // compare to expected output
      let expected_output = outputfile.replace("output", "expected");
      retCode = _compare(expected_output, outputfile, 2);
    }
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return process.exitCode = retCode;
}

(async () => {
  await init();

  if (await test("foo", "foo_transfer"))
    return 1;
  if (await test("foo", "foo_alias"))
    return 1;
  if (await test("foo", "foo_alias", true))
    return 1;
  if (await test("", "bad_urn"))
    process.exitCode = 0;
  else
    return 1;

  await Codex.tracts.relax();
})();
