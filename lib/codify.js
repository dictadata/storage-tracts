/**
 * etl/codify
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const fs = require('fs');
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

/**
 *
 */
module.exports = async (source) => {
  logger.verbose("codify ...");
  let retcode = 0;

  var j1;
  try {
    let options = source.options || {};
    j1 = await storage.activate(source.smt, options);

    // first load the source encoding
    let encoding = await j1.getEncoding();

    if (source.transform) {
      // run some constructs through the transform
      // to get the resulting encoding
      let rs = j1.getReadStream(source.options.reader || {max_read: 100});
      let tr = j1.getFieldsTransform();
      let cf = j1.getCodifyWriter();
      await pipeline([rs,tr,cf]);
      encoding = await cf.getEncoding();
    }

    logger.verbose(encoding);
    logger.verbose(JSON.stringify(encoding.fields, null, " "));

    if (source.outputFile) {
      logger.info("encoding saved to " + source.outputFile);
      await fs.promises.writeFile(source.outputFile, JSON.stringify(encoding, null, " "));
    }
    else {
      console.log(JSON.stringify(encoding, null, " "));
    }

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
