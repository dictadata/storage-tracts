/**
 * etl/scan
 */
"use strict";

const storage = require("@dictadata/storage-junctions");

const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);


module.exports = async (config) => {
  console.log("scan ...");

  var j1 = storage.activate(config.source.smt, config.source.options);
  var encoding = {};

  try {
    // first load the source encoding
    let scanOptions = Object.assign({}, config.source.options);
    scanOptions["forEach"] = async (filename) => {
      console.log(filename);

      let smt = Object.assign({}, j1._engram.smt);
      smt.schema = filename;
      let options2 = {};
      let j2 = storage.activate(smt,options2);

      let codifyOptions = {
        "encoding": encoding,
        "forEach": async (construct,engram) => {
          for (let name of Object.keys(construct)) {
            let field = engram.fields[name];
            if (field) {
              if (!field.firstDate) {
                field.firstDate = 'x';
              }
              field.lastDate = 'y';
            }
          }
        }
      };

      var codify = await j2.getCodifyTransform(codifyOptions);
      await pipeline(j2.getReadStream(), codify);
      //console.log(encoding);
    };

    await j1.scan(scanOptions);

    console.log(">>> encoding results");
    //console.log(encoding);
    console.log(JSON.stringify(encoding, null, "  "));

    return ("scan comlete.");
  }
  catch (err) {
    console.error('scan failed: ' + err.message);
    throw(err);
  }
  finally {
    j1.relax();
  }

};
