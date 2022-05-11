/**
 * etl/transfer
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const { logger } = require("@dictadata/storage-junctions/utils");

const fs = require('fs/promises');
const stream = require('stream').promises;

/**
 *
 */
module.exports = async (tract) => {
  logger.info("=== transfer");
  let retCode = 0;

  var jo;
  var jtl = [];
  try {
    let reader = null;
    let writers = [];
    let transforms = tract.transform || tract.transforms || {};

    logger.verbose(">>> origin tract");
    if (!tract.origin.options) tract.origin.options = {};
    if (!tract.terminal.options) tract.terminal.options = {};

    logger.verbose(">>> create origin junction " + JSON.stringify(tract.origin.smt, null, 2));
    jo = await Storage.activate(tract.origin.smt, tract.origin.options);

    logger.verbose(">>> getEncoding");
    let encoding = {};
    if (jo.capabilities.encoding && transforms.length === 0) {
      // if not a filesystem based source and no transforms defined
      // then get encoding from source
      let results = await jo.getEncoding();
      encoding = results.data[ "encoding" ];
    }
    else {
      // if filesystem based source or transforms defined
      // then run some data through the codifier
      let pipes = [];

      let options = Object.assign({ max_read: 100 }, tract.origin.pattern);
      reader = jo.createReader(options);
      reader.on('error', (error) => {
        logger.error("transfer reader: " + error.message);
      });
      pipes.push(reader);

      for (let [ tfType, tfOptions ] of Object.entries(transforms))
        pipes.push(await jo.createTransform(tfType, tfOptions));

      let ct = await jo.createTransform('codify');
      pipes.push(ct);

      await stream.pipeline(pipes);
      encoding = ct.encoding;
    }

    logger.verbose(">>> createReader");
    reader = jo.createReader(tract.origin.pattern);
    reader.on('error', (error) => {
      logger.error("transfer reader: " + error.message);
    });

    logger.verbose(">>> origin transforms");
    for (let [ tfName, tfOptions ] of Object.entries(transforms)) {
      let tfType = tfName.split("-")[ 0 ];
      reader = reader.pipe(await jo.createTransform(tfType, tfOptions));
    }

    if (!tract.terminal.options.encoding) {
      // use origin encoding
      tract.terminal.options.encoding = encoding;
    }

    if (!Array.isArray(tract.terminal)) {
      // a single terminal object
      logger.verbose(">>> Terminal Tract");
      let terminal = tract.terminal;

      logger.verbose(">>> create terminal junction " + terminal.smt);
      let jt = await Storage.activate(terminal.smt, terminal.options);
      jtl.push(jt);

      if (!terminal.options.append && jt.capabilities.encoding) {
        logger.verbose(">>> createSchema");
        let results = await jt.createSchema();
        logger.verbose(results.resultText);
      }

      logger.verbose(">>> createWriter");
      let writer = jt.createWriter();
      writer.on('error', (error) => {
        logger.error("transfer writer: " + error.message);
      });

      writer = reader.pipe(writer);
      writers.push(writer);
    }
    else {
      // sub-terminal tracts
      logger.verbose(">>> Terminal Tee");
      for (let branch of tract.terminal) {
        logger.verbose(">>> create terminal junction " + branch.terminal.smt);
        let jt = await Storage.activate(branch.terminal.smt, branch.terminal.options);
        jtl.push(jt);

        if (!tract.terminal.options.append && jt.capabilities.encoding) {
          logger.verbose(">>> createSchema");
          encoding = await jt.createSchema();
        }

        let writer = null;
        logger.verbose(">>> transforms");
        let transforms = branch.transform || branch.transforms || {};
        for (let [ tfName, tfOptions ] of Object.entries(transforms)) {
          let tfType = tfName.split("-")[ 0 ];
          let t = await jt.createTransform(tfType, tfOptions);
          writer = (writer) ? writer.pipe(t) : reader.pipe(t);
        }

        logger.verbose(">>> createWriter");
        // add terminal
        let w = jt.createWriter();
        w.on('error', (error) => {
          logger.error("transfer writer: " + error.message);
        });

        writer = (writer) ? writer.pipe(w) : reader.pipe(w);

        writers.push(writer);
      }
    }

    logger.verbose(">>> wait on transfer");
    await stream.finished(reader);
    for (let writer of writers)
      await stream.finished(writer);

    logger.info("=== completed");
  }
  catch (err) {
    logger.error("transfer: " + err.message);
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
