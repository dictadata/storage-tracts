/**
 * etl/list
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const fs = require('fs/promises');

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("list ...");
  let retCode = 0;

  try {
    let origin = tract.origin || {};
    var j1 = await storage.activate(origin.smt, origin.options);

    let list = await j1.list();

    logger.verbose(JSON.stringify(list, null, " "));
    if (tract.terminal.output) {
      logger.info("list saved to " + tract.terminal.output);
      await fs.writeFile(tract.terminal.output, JSON.stringify(list, null, " "));
    }
    else {
      console.log(JSON.stringify(list, null, " "));
    }

  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }
  finally {
    await j1.relax();
  }

  return retCode;
};
