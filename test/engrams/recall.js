/**
 * test/engrams/recall
 *
 * Test Outline:
 *   use engrams with Elasticsearch junction
 *   recall engram definition for foo_schema
 *   compare results to expected foo_schema encoding
 */
"use strict";

const { Engrams } = require("../../storage");
const { logger } = require("../../storage/utils");
const _compare = require("../lib/_compare");

const fs = require('fs');
const path = require('path');

logger.info("=== Tests: engrams recall");

async function init() {
  let result = 0;
  try {
    // activate engrams
    let engrams = Engrams.use("engram", "elasticsearch|http://dev.dictadata.net:9200/|storage_engrams|*");
    if (!await engrams.activate())
      result = 1;
  }
  catch (err) {
    logger.error(err);
    result = 1;
  }
  return result;
}

async function test(domain, schema, resolve = false) {
  let retCode = 0;

  try {
    let urn = domain + ':' + schema;
    logger.verbose('=== ' + urn);

    // recall engram definition
    let results = await Engrams.engrams.recall(urn, resolve);
    logger.verbose(JSON.stringify(results, null, "  "));

    if (results.status !== 0) {
      retCode = results.status;
    }
    else {
      if (urn !== Object.keys(results.data)[ 0 ])
        return 1;
      //let encoding = results.data[ urn ];

      let outputfile = "./test/data/output/engrams/" + (resolve ? "resolve_" : "recall_") + schema + ".encoding.json";
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

  if (await test("foo", "foo_schema"))
    return 1;
  if (await test("foo", "foo_alias"))
    return 1;
  if (await test("foo", "foo_alias", true))
    return 1;
  if (await test("", "bad_urn"))
    process.exitCode = 0;
  else
    return 1;

  await Engrams.engrams.relax();
})();
