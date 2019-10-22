/**
 * etl/config
 */
"use strict";

const fs = require('fs');
const path = require('path');

module.exports = () => {

  try {
    var config = {
      source: {},
      destination: {},
      transforms: null
    };

    // ["node.exe", "storage-xxx.js", "command", "param1", ...]
    var argv = process.argv.slice(2);
    var command = argv[0];

    if (command === "convert") {
      // create config file from command line parameters

      // source
      config.source.codify = true;
      if (argv[1].indexOf('|') >= 0) {
        config.source.smt = argv[1];
      }
      else {
        // then assume it is a filename
        var info1 = path.parse(argv[1]);
        config.source.smt = info1.ext.slice(1) + "|" + info1.dir + "|" + info1.base + "|*";
      }

      // destination
      config.destination.create = true;
      if (argv[2].indexOf('|') >= 0) {
        config.destination.smt = argv[2];
      }
      else {
        // then assume it is a filename
        var info2 = path.parse(argv[2]);
        config.destination.smt = info2.ext.slice(1) + "|" + info2.dir + "|" + info2.base + "|*";
      }

      if (argv[3]) {
        config.transforms = argv[3];  // filename of transforms, loaded below
      }
    }
    else {
      // read the config file
      console.log("config: " + argv[1]);
      config = JSON.parse(fs.readFileSync(argv[1], 'utf-8'));
    }

    // convert any consolidate ranges to arrays
    if (config.consolidate) {
      for (let [name,value] of Object.entries(config.consolidate)) {
        if (!Array.isArray(value)) {
          let min = value.min || 1;
          let max = value.max || 0;
          let inc = value.inc || 1;
          let steps = [];
          for (let i = min; i <= max; i += inc)
            steps.push(i);
          config.consolidate[name] = steps;
        }
      }
    }

    if (typeof config.encoding === "string") {
      // config contains name of encoding file
      let encoding = JSON.parse(fs.readFileSync(config.encoding, 'utf-8'));
      config.encoding = encoding.fields || encoding;
    }

    if (typeof config.transforms === "string") {
      // config contains name of transforms file
      let transforms = JSON.parse(fs.readFileSync(config.transforms, 'utf-8'));
      config.transforms = transforms.transforms || transforms;
    }

    return config;
  }
  catch (err) {
    console.error('config failed:' + err.message);
  }

};
