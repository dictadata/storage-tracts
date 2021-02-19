/**
 * etl/transfer
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
  logger.verbose("transfer ...");
  let retCode = 0;

  var jo;
  var jtl = [];
  try {
    let reader = null;
    let writers = [];
    logger.info(">>> Origin Tract");

    logger.info(">>> create junction " + tract.origin.smt);
    jo = await storage.activate(tract.origin.smt, tract.origin.options);

    logger.verbose(">>> getEncoding");
    // load origin encoding for validation
    let encoding = tract.origin.encoding;
    if (typeof encoding === "string")
      encoding = JSON.parse(await fs.readFile(encoding, "utf8"));
    if (typeOf(encoding) === "object")
      encoding = await jo.putEncoding(encoding, true);
    else
      encoding = await jo.getEncoding();

    logger.verbose(">>> createReadStream");
    reader = jo.createReadStream();

    logger.verbose(">>> origin transforms");
    let transforms = tract.transforms || {};
    for (let [tfName, tfOptions] of Object.entries(transforms)) {
      let tfType = tfName.split("-")[0];
      reader = reader.pipe(jo.createTransform(tfType, tfOptions));
    }

    logger.info(">>> Terminal Tract(s)");
    if (!Array.isArray(tract.terminal)) {
      // a single terminal object
      let terminal = tract.terminal;

      logger.info(">>> create junction " + terminal.smt );
      let jt = await storage.activate(terminal.smt, terminal.options);
      jtl.push(jt);

      logger.verbose(">>> putEncoding");
      if (terminal.encoding)
        encoding = terminal.encoding;
      if (typeof encoding === "string")
        encoding = JSON.parse(await fs.readFile(encoding, "utf8"));
      encoding = await jt.putEncoding(encoding, terminal.overlay_encoding);

      logger.verbose(">>> createWriteStream");
      let writer = jt.createWriteStream();
      writer = reader.pipe(writer);
      writers.push(writer);
    }
    else {
      // sub-terminal tracts
      for (let branch of tract.terminal) {
        logger.info(">>> create junction " + branch.terminal.smt);
        let jt = await storage.activate(branch.terminal.smt, branch.terminal.options);
        jtl.push(jt);

        logger.verbose(">>> putEncoding");
        if (branch.terminal.encoding)
          encoding = branch.terminal.encoding;
        if (typeof encoding === "string")
          encoding = JSON.parse(await fs.readFile(encoding, "utf8"));
        encoding = await jt.putEncoding(encoding, branch.terminal.overlay_encoding);

        logger.info(">>> Terminal Tee");
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

    logger.info(">>> wait on transfer");
    await finished(reader);
    for (let writer of writers)
      await finished(writer);

    logger.info(">>> completed");
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
