#!/usr/bin/env node

"use strict";

const fs = require('fs')
const path = require('path');

//const encoding = require('./lib/encoding');
const transfer = require('./lib/transfer');

console.log("@dicta-io/storage-etl");

async function main() {

  var argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.log("Usage:  node storage-etl.js <source> <destination> [<transforms.json>]");
    console.log("        node storage-etl.js <options.json>");
    return;
  }

  var options = {
    source: {},
    destination: {},
    transforms: null
  };

  try {

    if (argv.length === 1) {
      // assume it's a options file
      console.log("options: " + argv[0]);
      options = JSON.parse(fs.readFileSync(argv[0], 'utf-8'));
    }
    else {
      options.source.smt = argv[0];
      if (argv[0].indexOf('|') < 0) {
        // assume it is a filename
        var info1 = path.parse(argv[0]);
        options.source.smt = info1.ext.slice(1) + "|" + info1.dir + "|" + info1.base + "|*";
      }

      options.destination.smt = argv[1];
      if (argv[1].indexOf('|') < 0) {
        // assume it is a filename
        var info2 = path.parse(argv[1]);
        options.destination.smt = info2.ext.slice(1) + "|" + info2.dir + "|" + info2.base + "|*";
      }

      if (argv[2])
        options.transforms = JSON.parse(fs.readFileSync(argv[2], 'utf-8'));
    }

    transfer(options);
  }
  catch (err) {
    console.error('Transfer failed:' + JSON.stringify(err,null,"  "));
  }
}

main();
