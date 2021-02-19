/**
 * etl/scan
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const stream = require('stream/promises');
const fs = require('fs/promises');


/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("scan ...");
  let retCode = 0;

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
      pipes.push(jo.createReadStream({ schema: entry.name }));
      for (let [tfType, toptions] of Object.entries(transforms))
        pipes.push(jo.createTransform(tfType, toptions));
      pipes.push(jo.createTransform('codify', origin));
      await stream.pipeline(pipes);
    }

    logger.debug(JSON.stringify(origin.encoding, null, " "));

    if (tract.terminal.output) {
      logger.info("encoding saved to " + tract.terminal.output);
      await fs.writeFile(tract.terminal.output, JSON.stringify(origin.encoding, null, " "));
    }
    else {
      console.log(JSON.stringify(origin.encoding, null, " "));
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
