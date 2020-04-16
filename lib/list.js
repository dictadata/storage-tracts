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
module.exports = async (tract) => {
  logger.verbose("list ...");
  let retcode = 0;

  try {
    let origin = tract.origin || {};
    var j1 = await storage.activate(origin.smt, origin.options);

    let list = await j1.list();

    logger.debug(JSON.stringify(list, null, " "));
    if (origin.outputFile) {
      logger.info("list saved to " + origin.outputFile);
      await fs.promises.writeFile(origin.outputFile, JSON.stringify(list, null, " "));
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
