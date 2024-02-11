/**
 * test/tracts/dull
 *
 * Test Outline:
 *   use tracts with Elasticsearch junction
 *   dull tract definition for "foo_transfer_two" in tracts
 */
"use strict";

const { Codex } = require("../../storage");
const { logger } = require("../../storage/utils");

logger.info("=== Tests: tracts dull");

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

async function test(domain, name) {
  let retCode = 0;

  try {
    logger.verbose('=== dull ' + name);

    let results = await Codex.tracts.dull({ domain: domain, name: name });
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
      logger.verbose('=== dull ' + key);

      let results = await Codex.tracts.dull(key);
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

  if (await test("foo", "foo_transfer_two")) return 1;

  // delete extraneous entries
  await test_keys(["foo:foo_alias" ]);

  await Codex.tracts.relax();

  // give Elasticsearch time to refresh its index
  await new Promise((r) => setTimeout(r, 1100));
})();
