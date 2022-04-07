/**
 * etl/dull
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const fs = require('fs');
const path = require('path');

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("dull ...");
  let retCode = 0;

  try {
    let origin = tract.origin || {};
    var j1 = await Storage.activate(origin.smt, origin.options);

    let results;
    if (origin.options.schema)
      results = await j1.dullSchema();
    else
      results = await j1.dull(origin.options.pattern);

    if (tract.terminal.output) {
      logger.info("results saved to " + tract.terminal.output);
      fs.mkdirSync(path.dirname(tract.terminal.output), { recursive: true });
      fs.writeFileSync(tract.terminal.output, JSON.stringify(results, null, " "));
    }
    else {
      console.log(JSON.stringify(results, null, " "));
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
