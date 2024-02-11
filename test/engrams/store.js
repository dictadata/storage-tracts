/**
 * test/engrams/store
 *
 * Test Outline:
 *   use engrams with Elasticsearch junction
 *   read engram(s) from file
 *   store engram(s) in engrams
 */
"use strict";

const { Engrams } = require("../../storage");
const { Engram } = require("../../storage/types");
const { logger } = require("../../storage/utils");
const fs = require('fs');

logger.info("=== Tests: engrams store");

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

async function store(schema) {
  let retCode = 0;

  let encoding;
  try {
    logger.verbose('=== store ' + schema);

    // store encoding
    encoding = JSON.parse(fs.readFileSync("./test/data/input/encodings/" + schema + ".encoding.json", "utf8"));
    encoding.name = schema;

    let entry = new Engram(encoding);

    if (!entry.tags) {
      entry.tags = [];
      entry.tags.push("foo");
    }

    let results = await Engrams.engrams.store(entry);
    logger.verbose(JSON.stringify(results, null, "  "));
    if (results.status > 201)
      retCode = 1;
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

    let results = await Engrams.engrams.store(entry);
    logger.verbose(JSON.stringify(results, null, "  "));
    if (results.status > 201)
      retCode = 1;
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return process.exitCode = retCode;
}

(async () => {
  await init();

  if (await store("foo_schema")) return 1;
  if (await store("foo_schema_short")) return 1;
  if (await store("foo_schema_typesonly")) return 1;
  if (await store("foo_schema_two")) return 1;

  if (await alias("foo_alias", "foo:foo_schema")) return 1;

  await Engrams.engrams.relax();
})();
