/**
 * etl/scan
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const stream = require('stream');
const fs = require('fs');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("scan ...");
  let retcode = 0;

  var jo;
  try {
    let origin = tract.origin || {};
    let transforms = tract.transforms || {};
    if (!origin.options) origin.options = {};
    if (!origin.encoding) origin.encoding = {};

    // Note that encodings will be updated in origin.encoding
    // and used between instances of CodifyWriter.

    jo = await storage.activate(origin.smt, origin.options);
    let list = await jo.list();

    // loop through files
    for (let entry of list) {
      logger.verbose("build pipeline");
      let pipes = [];
      pipes.push(jo.getReadStream({ schema: entry.name }));
      for (let [tfType, toptions] of Object.entries(transforms))
        pipes.push(jo.getTransform(tfType, toptions));
      pipes.push(jo.getTransform('codify', origin));
      await pipeline(pipes);
    }

    logger.debug(JSON.stringify(origin.encoding, null, " "));

    if (typeof tract.terminal === "string") {
      logger.info("encoding saved to " + tract.terminal);
      await fs.promises.writeFile(tract.terminal, JSON.stringify(origin.encoding, null, " "));
    }
    else {
      console.log(JSON.stringify(origin.encoding, null, " "));
    }

  }
  catch (err) {
    logger.error(err);
    retcode = -1;
  }
  finally {
    if (jo) await jo.relax();
  }

  return retcode;
};
