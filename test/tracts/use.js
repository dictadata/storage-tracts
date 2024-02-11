/**
 * test/tracts/tracts_use
 *
 * Test Outline:
 *   retrieve tract and execute transfer
 *   compare results with expected output
 */
"use strict";

const { Codex } = require("../../storage");
const transfer = require('../lib/_transfer');
const { logger } = require("../../storage/utils");

const fs = require('fs');
const path = require('path');

logger.info("=== Tests: tracts use");

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

async function test(tract_name) {
  let retCode = 0;
  let urn = "foo:" + tract_name;

  try {
    logger.verbose('=== use ' + urn);

    // recall tract definition
    let results = await Codex.tracts.recall({ match: urn, resolve: true });
    logger.debug(JSON.stringify(results, null, "  "));
    if (results.status !== 0) {
      retCode = results.status;
    }
    else {
      if (tract_name.indexOf("alias") >= 0)
        urn = Object.keys(results.data)[ 0 ];
      let entry = results.data[ urn ];

      retCode = await transfer(entry.tracts[ 0 ]);
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

  if (await test("jsonfile-foo_transfer")) return 1;
  if (await test("elasticsearch-foo_transfer")) return 1;
  if (await test("mssql-foo_transfer")) return 1;
  if (await test("mysql-foo_transfer")) return 1;

  if (await test("elasticsearch-foo_alias")) return 1;

  await Codex.tracts.relax();
})();
