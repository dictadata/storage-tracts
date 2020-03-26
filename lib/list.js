/**
 * etl/list
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const fs = require('fs');

/**
 *
 */
module.exports = async (source) => {
  logger.verbose("list ...");
  let retcode = 0;

  try {
    let options = source.options || {};
    var j1 = await storage.activate(source.smt, source.options);

    let list = await j1.list();
    logger.verbose(JSON.stringify(list, null, " "));

    if (source.outputFile) {
      logger.info("list saved to " + source.outputFile);
      await fs.promises.writeFile(source.outputFile, JSON.stringify(list, null, " "));
    }
    else {
      console.log(JSON.stringify(list, null, " "));
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
