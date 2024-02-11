/**
 * test/tracts/store
 *
 * Test Outline:
 *   use tracts with Elasticsearch junction
 *   read tract definition from file
 *   store tract definition in tracts
 */
"use strict";

const { Codex } = require("../../storage");
const { Tract } = require("../../storage/types");
const { logger } = require("../../storage/utils");
const fs = require('fs');

logger.info("=== Tests: tracts store");

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

async function store(tract_name) {
  let retCode = 0;

  let entry;
  try {
    logger.verbose('=== store ' + tract_name);

    entry = JSON.parse(fs.readFileSync("./test/data/input/tracts/" + tract_name + ".tracts.json", "utf8"));
    entry.name = tract_name;

    if (!entry.tags) {
      entry.tags = [];
      entry.tags.push("foo");
    }

    let results = await Codex.tracts.store(entry);
    logger.verbose(JSON.stringify(results, null, "  "));
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return process.exitCode = retCode;
}

async function alias(alias, urn) {
  let retCode = 0;

  try {
    logger.verbose('=== alias ' + alias);

    // store alias entry
    let entry = {
      domain: "foo",
      name: alias,
      type: "alias",
      title: alias,
      description: "alias for " + urn,
      source: urn,
      tags: [ "foo", "alias" ]
    };

    let results = await Codex.tracts.store(entry);
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

  if (await store("foo_transfer")) return 1;
  if (await store("foo_transfer_two")) return 1;

  if (await alias("foo_alias", "foo:foo_transfer")) return 1;

  await Codex.tracts.relax();
})();
