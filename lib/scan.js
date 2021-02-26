/**
 * etl/scan
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const stream = require('stream/promises');
const fs = require('fs/promises');

/**
 * List schemas at a locus
 * and create a composite encoding.
 */
module.exports = async (tract) => {
  logger.info("scan: " + tract.origin.smt);
  let retCode = 0;

  var jo;
  try {
    let transforms = tract.transforms || {};
    if (!tract.origin.options) tract.origin.options = {};
    let encoding = tract.origin.options.encoding || {};

    jo = await storage.activate(tract.origin.smt, tract.origin.options);

    // get list of schemas to scan
    let list = await jo.list();

    // loop through files and codifyh
    for (let entry of list) {
      logger.verbose(entry.name);
      let pipes = [];
      pipes.push(jo.createReadStream({ schema: entry.name }));

      for (let [tfType, toptions] of Object.entries(transforms))
        pipes.push(jo.createTransform(tfType, toptions));
      
      pipes.push(jo.createTransform('codify', { encoding: encoding }));

      await stream.pipeline(pipes);
    }

    if (tract.terminal.output) {
      logger.debug(JSON.stringify(encoding, null, " "));
      logger.info("encoding saved to " + tract.terminal.output);
      await fs.writeFile(tract.terminal.output, JSON.stringify(encoding, null, " "));
    }
    else {
      console.log(JSON.stringify(encoding, null, " "));
    }

  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }
  finally {
    if (jo) await jo.relax();
  }

  return retCode;
};
