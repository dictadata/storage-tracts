/**
 * test/engrams/engrams_use
 *
 * Test Outline:
 *   use engrams with Elasticsearch junction
 *   create junction using SMT name(s)
 *   use junction to retrieve data
 *   compare results with expected output
 */
"use strict";

const { Storage, Engrams } = require("../../storage");
const { logger } = require("../../storage/utils");
const _compare = require("../lib/_compare");

const fs = require('fs');
const path = require('path');

logger.info("=== Tests: engrams use");

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

async function test(name) {
  let retCode = 0;
  let urn = "foo:" + name;

  try {
    logger.verbose('=== retrieve ' + urn);

    // create junction
    let junction = await Storage.activate(urn, { auth: { "username": "dicta", password: "data" } });

    // retrieve engrams entries
    let results = await junction.retrieve({
      match: {
        "Bar": {
          wc: "row*"
        }
      }
    });

    let outputfile = "./test/data/output/engrams/use_" + name + ".json";
    logger.verbose("output file: " + outputfile);
    fs.mkdirSync(path.dirname(outputfile), { recursive: true });
    fs.writeFileSync(outputfile, JSON.stringify(results, null, 2), "utf8");

    // compare to expected output
    let expected_output = outputfile.replace("output", "expected");
    retCode = _compare(expected_output, outputfile, 2);

    await junction.relax();
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return process.exitCode = retCode;
}

(async () => {
  await init();

  if (await test("jsonfile-foo_schema")) return 1;
  if (await test("elasticsearch-foo_schema")) return 1;
  if (await test("elasticsearch-foo_alias")) return 1;
  if (await test("mssql-foo_schema")) return 1;
  if (await test("mysql-foo_schema")) return 1;

  await Engrams.engrams.relax();
})();
