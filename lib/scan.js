/**
 * etl/scan
 */
"use strict";

const storage = require("@dictadata/storage-junctions");

const stream = require('stream');
const fs = require('fs');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);


module.exports = async (config) => {
  logger.verbose("scan ...");
  let retcode = 0;

  try {
    let scanOptions = config.scan || {};
    let codifyOptions = config.codify || {};
    codifyOptions.encoding = {},

    scanOptions.forEach = async (filename) => {
      //if (filename.startsWith(j1.smt.locus))
      //  filename = filename.slice(j1.smt.locus.length);
      logger.verbose(filename);
      let smt = Object.assign({}, j1.smt, {schema: filename});

      let j2 = storage.activate(smt, config.source.options);
      var codify = await j2.getCodifyWriter(codifyOptions);
      await pipeline(j2.getReadStream(), codify);

      if (config.output)
        await fs.promises.writeFile(config.output, JSON.stringify(codifyOptions.encoding));
    };

    var j1 = storage.activate(config.source.smt, config.source.options);
    await j1.scan(scanOptions);

    logger.verbose(">>> encoding results");
    logger.debug(encoding);
    if (config.output) {
      logger.info("saved to " + config.output);
      await fs.promises.writeFile(config.output, JSON.stringify(codifyOptions.encoding, null, "  "));
    }
    else
      console.log(JSON.stringify(codifyOptions.encoding, null, "  "));

    return ("scan comlete.");
  }
  catch (err) {
    logger.error(err);
    retcode = -1;
  }
  finally {
    await j1.relax();
  }

  return retcode;
};
