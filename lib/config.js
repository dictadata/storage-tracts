/**
 * etl/config
 */
"use strict";

const fs = require('fs');
const path = require('path');

module.exports = async () => {

  try {
    var config = {
      source: {},
      destination: {},
      transforms: null
    };

    var argv = process.argv.slice(2);

    if (argv.length === 2) {
      // read the config file
      console.log("config: " + argv[1]);
      config = JSON.parse(fs.readFileSync(argv[1], 'utf-8'));
    }
    else {
      // create config file from command line parameters

      config.source.smt = argv[0];
      config.source.codify = true;
      if (argv[0].indexOf('|') < 0) {
        // assume it is a filename
        var info1 = path.parse(argv[0]);
        config.source.smt = info1.ext.slice(1) + "|" + info1.dir + "|" + info1.base + "|*";
      }

      config.destination.smt = argv[1];
      config.destination.create = true;
      if (argv[1].indexOf('|') < 0) {
        // assume it is a filename
        var info2 = path.parse(argv[1]);
        config.destination.smt = info2.ext.slice(1) + "|" + info2.dir + "|" + info2.base + "|*";
      }

      if (argv[2]) {
        let transforms = JSON.parse(fs.readFileSync(argv[2], 'utf-8'));
        config.transforms = transforms.transforms || transforms;
      }
    }

    if (typeof config.encoding === "string") {
      // config contains name of encoding file
      let encoding = JSON.parse(fs.readFileSync(config.encoding, 'utf-8'));
      config.encoding = encoding.fields || encoding;
    }

    return config;
  }
  catch (err) {
    console.error('config failed:' + err.message);
  }

};
