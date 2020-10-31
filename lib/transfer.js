/**
 * etl/transfer
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');

const fs = require('fs/promises');
const stream = require('stream/promises');

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("transfer ...");
  let retcode = 0;

  var jo;
  var jtl = [];
  try {
    let reader = null;
    let writers = [];

    logger.info(">>> create origin junction");
    jo = await storage.activate(tract.origin.smt, tract.origin.options);

    logger.debug(">>> get origin encoding");
    // load origin encoding for validation
    let encoding = tract.origin.encoding;
    if (typeof encoding === "string")
      encoding = JSON.parse(await fs.readFile(encoding, "utf8"));
    if (typeof encoding === "object")
      encoding = await jo.putEncoding(encoding);
    else
      encoding = await jo.getEncoding();

    logger.info(">>> create origin reader tract");
    reader = jo.getReadStream();
    logger.verbose("add origin transforms");
    let transforms = tract.transforms || {};
    for (let [tfName, tfOptions] of Object.entries(transforms)) {
      let tfType = tfName.split("-")[0];
      reader = reader.pipe(jo.getTransform(tfType, tfOptions));
    }

    logger.info(">>> create terminal tract(s)");
    if (!Array.isArray(tract.terminal)) {
      // a single terminal object
      let terminal = tract.terminal;

      logger.info(">>> create terminal junction");
      let jt = await storage.activate(terminal.smt, terminal.options);
      jtl.push(jt);

      logger.info(">>> put terminal encoding");
      if (terminal.encoding)
        encoding = terminal.encoding;
      if (typeof encoding === "string")
        encoding = JSON.parse(await fs.readFile(encoding, "utf8"));
      encoding = await jt.putEncoding(encoding);

      logger.verbose("add terminal writer ...");
      let writer = jt.getWriteStream();
      writer = reader.pipe(writer);
      writers.push(writer);
    }
    else {
      // sub-terminal tracts
      for (let branch of tract.terminal) {
        logger.info(">>> create terminal junction");
        let jt = await storage.activate(branch.terminal.smt, branch.terminal.options);
        jtl.push(jt);

        logger.info(">>> put terminal encoding");
        if (branch.terminal.encoding)
          encoding = branch.terminal.encoding;
        if (typeof encoding === "string")
          encoding = JSON.parse(await fs.readFile(encoding, "utf8"));
        encoding = await jt.putEncoding(encoding);

        logger.info(">>> create terminal tee");
        let writer = null;
        logger.verbose("add terminal transforms");
        let transforms = branch.transforms || {};
        for (let [tfName, tfOptions] of Object.entries(transforms)) {
          let tfType = tfName.split("-")[0];
          let t = jt.getTransform(tfType, tfOptions);
          writer = (writer) ? writer.pipe(t) : reader.pipe(t);
        }
        logger.verbose("add terminal writer ...");
        // add terminal
        let w = jt.getWriteStream();
        writer = (writer) ? writer.pipe(w) : reader.pipe(w);

        writers.push(writer);
      }
    }

    logger.info(">>> wait on pipes");
    await finished(reader);
    //for (let writer of writers)
    //  await finished(writer);

    logger.info(">>> completed");
  }
  catch (err) {
    logger.error(err);
    retcode = -1;
  }
  finally {
    if (jo)
      await jo.relax();
    for (let j of jtl)
      await j.relax();
  }

  return retcode;
};
