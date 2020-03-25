/**
 * etl/codify
 */
"use strict";

const storage = require("@dictadata/storage-junctions");

const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);


module.exports = async (config) => {
  logger.verbose("codify ...");
  let retcode = 0;

  var j1;
  try {
    j1 = storage.activate(config.source.smt, config.source.options);

    // first load the source encoding
    config.encoding = await j1.getEncoding();

    if (config.transform) {
      // run some constructs through the transform
      // to get the resulting encoding
      let rs = j1.getReadStream({ codify: true, max_read: 1000 });
      let tr = j1.getTransform(config.transform);
      let cf = j1.getCodifyWriter();
      await pipeline([rs,tr,cf]);
      config.encoding = await cf.getEncoding();
    }

    logger.verbose(">>> encoding results");
    logger.verbose(config.encoding);
    logger.verbose(JSON.stringify(config.encoding.fields, null, "  "));

    return ("Codify comlete.");
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
