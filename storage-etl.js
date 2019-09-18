#!/usr/bin/env node

"use strict";

const storage = require("@dicta-io/storage-junctions");
const stream = require('stream');
const util = require('util');
const fs = require('fs')
const path = require('path');

console.log("@dicta-io/storage-etl");

const pipeline = util.promisify(stream.pipeline);

async function main() {

  var argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.log("Usage:  node storage-etl.js <inputfile> <outputfile> [<transforms.json>]");
    return;
  }
  var inputfile = argv[0];
  var outputfile = argv[1];
  var transformsfile = argv[2] || "";

  try {
    let transforms = null;
    if (transformsfile)
      transforms = JSON.parse(fs.readFileSync(transformsfile, 'utf-8'));

    var transformOptions = {
      template: {},
      transforms: transforms
    };

    //console.log(">>> create junctions");
    var info1 = path.parse(inputfile);
    var smt1 = info1.ext.slice(1) + "|" + info1.dir + "|" + info1.base + "|*";
    var j1 = storage.create(smt1, {filename: inputfile});
    var info2 = path.parse(outputfile);
    var smt2 = info2.ext.slice(1) + "|" + info2.dir + "|" + info2.base + "|*";
    var j2 = storage.create(smt2, {filename: outputfile});

    console.log("input: " + smt1);
    console.log("output: ",smt2);
    console.log("transform: ", transforms !== null)

    console.log("codify ...");
    var codifyPipes = [j1.getReadStream({codify: true, max_lines: 1000})];
    if (transformsfile)
      codifyPipes.push(j1.getTransform(transformOptions));
    let codify = j1.getCodifyTransform();
    codifyPipes.push(codify);

    await pipeline(codifyPipes);
    let encoding = await codify.getEncoding();

    //console.log(">>> encoding results");
    //console.log(encoding);
    //console.log(JSON.stringify(encoding.fields, null, "  "));

    j2.putEncoding(encoding);

    console.log("convert ...");
    var mainPipes = [j1.getReadStream()];
    if (transformsfile)
      mainPipes.push(j1.getTransform(transformOptions));
    mainPipes.push(j2.getWriteStream());

    await pipeline(mainPipes);

    console.log("completed.");
  }
  catch (err) {
    console.error('Pipeline failed:', err);
  }
}

main();
