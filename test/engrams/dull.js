/**
 * test/engrams/dull
 *
 * Test Outline:
 *   use engrams with Elasticsearch junction
 *   dull engram definition for "foo_schema_two" in engrams
 */
"use strict";

const { Engrams } = require("../../storage");
const { logger } = require("../../storage/utils");

logger.info("=== Tests: engrams dull");

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

async function test(domain, schema) {
  let retCode = 0;

  try {
    logger.verbose('=== ' + schema);

    // dull encoding
    let results = await Engrams.engrams.dull({ domain: domain, name: schema });
    logger.info(JSON.stringify(results, null, "  "));

    // compare to expected output

  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return process.exitCode = retCode;
}

async function test_keys(keys) {
  let retCode = 0;

  try {
    for (let key of keys) {
      logger.verbose('=== ' + key);

      // dull encoding
      let results = await Engrams.engrams.dull(key);
      logger.info(JSON.stringify(results, null, "  "));
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

  if (await test("", "foo_schema_two")) return 1;

  // delete extraneous entries
  // await test_keys(["foo:foo_schema_XYZ" ]);

  await Engrams.engrams.relax();

  // give Elasticsearch time to refresh its index
  await new Promise((r) => setTimeout(r, 1100));
})();
