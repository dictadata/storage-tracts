/**
 * etl/synchronize
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const typeOf = storage.Types.typeOf;
const logger = require('./logger');

const fs = require('fs/promises');
const { finished } = require('stream/promises');

/**
 *
 */
module.exports = async (tract) => {
  logger.info("synchronize ...");
  let retCode = 0;

  var jo;
  var jtl = [];
  try {
    let reader = null;
    let writers = [];
    let pattern = {
      match: {
      }
    }
    pattern.match[tract.state.field] = {
      "gt": tract.state.value
    };

    logger.verbose(">>> Origin Tract");
    if (!tract.origin.options) tract.origin.options = {};
    if (!tract.terminal.options) tract.terminal.options = {};

    logger.verbose(">>> check origin encoding");
    if (tract.origin.options && typeof tract.origin.options.encoding === "string") {
      // read encoding from file
      let filename = tract.origin.options.encoding;
      tract.origin.options.encoding = JSON.parse(await fs.readFile(filename, "utf8"));
    }

    logger.verbose(">>> create junction " + tract.origin.smt);
    jo = await storage.activate(tract.origin.smt, tract.origin.options);

    logger.verbose(">>> getEncoding");
    let encoding = await jo.getEncoding();

    logger.verbose(">>> createReadStream");
    reader = jo.createReadStream(pattern);

    logger.verbose(">>> origin transforms");
    let transforms = tract.transforms || {};
    for (let [tfName, tfOptions] of Object.entries(transforms)) {
      let tfType = tfName.split("-")[0];
      reader = reader.pipe(jo.createTransform(tfType, tfOptions));
    }

    logger.verbose(">>> check terminal encoding");
    if (tract.terminal.options && typeof tract.terminal.options.encoding === "string") {
      // read encoding from file
      let filename = tract.terminal.options.encoding;
      tract.terminal.options.encoding = JSON.parse(await fs.readFile(filename, "utf8"));
    }
    else {
      // use origin encoding
      tract.terminal.options.encoding = encoding;
    }

    if (!Array.isArray(tract.terminal)) {
      // a single terminal object
      logger.verbose(">>> Terminal Tract");
      let terminal = tract.terminal;

      logger.verbose(">>> create junction " + terminal.smt );
      let jt = await storage.activate(terminal.smt, terminal.options);
      jtl.push(jt);

      if (!terminal.options.noCreate) {
        logger.verbose(">>> createSchema");
        encoding = await jt.createSchema();
      }

      logger.verbose(">>> createWriteStream");
      let writer = jt.createWriteStream();
      writer = reader.pipe(writer);
      writers.push(writer);
    }
    else {
      // sub-terminal tracts
      logger.verbose(">>> Terminal Tee");
      for (let branch of tract.terminal) {
        logger.verbose(">>> create junction " + branch.terminal.smt);
        let jt = await storage.activate(branch.terminal.smt, branch.terminal.options);
        jtl.push(jt);

        if (!terminal.options.noCreate) {
          logger.verbose(">>> createSchema");
          encoding = await jt.createSchema();
        }

        let writer = null;
        logger.verbose(">>> transforms");
        let transforms = branch.transforms || {};
        for (let [tfName, tfOptions] of Object.entries(transforms)) {
          let tfType = tfName.split("-")[0];
          let t = jt.createTransform(tfType, tfOptions);
          writer = (writer) ? writer.pipe(t) : reader.pipe(t);
        }
        logger.verbose(">>> createWriteStream");
        // add terminal
        let w = jt.createWriteStream();
        writer = (writer) ? writer.pipe(w) : reader.pipe(w);

        writers.push(writer);
      }
    }

    logger.verbose(">>> wait on transfer");
    await finished(reader);
    for (let writer of writers)
      await finished(writer);

    logger.verbose(">>> completed");
  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }
  finally {
    if (jo)
      await jo.relax();
    for (let j of jtl)
      await j.relax();
  }

  return retCode;
};