/**
 * test/tracts/tracts_add
 *
 * Test Outline:
 *   use tracts with underlying Elasticsearch junction
 *   add tract definitions for test transfers
 */
"use strict";

const { Engrams } = require("../../storage");
const { Tract } = require("../../storage/types");
const { logger } = require("../../storage/utils");
const fs = require('fs');

logger.info("=== Tests: tracts add");

async function init() {
  let result = 0;
  try {
    // activate tracts
    let tracts = Engrams.use("tract", "elasticsearch|http://dev.dictadata.net:9200/|storage_tracts|*");
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

  try {
    logger.verbose('=== store ' + tract_name);

    // store tract
    let entry = JSON.parse(fs.readFileSync("./test/data/input/tracts/" + tract_name + ".tracts.json", "utf8"));
    entry.name = tract_name;

    entry.domain = "foo";
    entry.name = tract_name;
    if (!entry.tags)
      entry.tags = [];
    entry.tags.push("foo");

    let results = await Engrams.tracts.store(entry);
    logger.verbose(JSON.stringify(results, null, "  "));
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return process.exitCode = retCode;
}

async function addAlias(alias, source) {
  let retCode = 0;

  try {
    logger.verbose('=== alias ' + alias);

    // store encoding
    let entry = {
      domain: "foo",
      name: alias,
      type: "alias",
      title: alias,
      description: "alias for " + source,
      source: source,
      tags: [ "foo", "alias" ]
    };

    let results = await Engrams.tracts.store(entry);
    logger.verbose(JSON.stringify(results, null, "  "));
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return process.exitCode = retCode;

}

(async () => {
  await init();

  if (await test("jsonfile-foo_transfer"))
    return 1;
  if (await test("elasticsearch-foo_transfer"))
    return 1;
  if (await test("mssql-foo_transfer"))
    return 1;
  if (await test("mysql-foo_transfer"))
    return 1;

  if (await addAlias("elasticsearch-foo_alias", "foo:elasticsearch-foo_transfer"))
    return 1;

  await Engrams.tracts.relax();
})();
