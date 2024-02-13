/**
 * storage/etl/synchronize
 * BROKEN!
 * not fully implemented, needs to be redesigned
 */
"use strict";

const Storage = require("../storage");

const stream = require('stream').promises;

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("synchronize ...");
  let retCode = 0;

  var jo;
  var jtl = [];
  try {
    let reader = null;
    let writers = [];

    let pattern = Object.assign({ match: {} },
      tract.origin.pattern);

    // what is tract.state ???
    pattern.match[ tract.state.field ] = {
      "gt": tract.state.value
    };

    let transforms = tract.transforms || [];

    logger.verbose(">>> Origin Tract");
    if (!tract.origin.options) tract.origin.options = {};
    if (!tract.terminal.options) tract.terminal.options = {};

    logger.verbose(">>> create origin junction " + tract.origin.smt);
    jo = await Storage.activate(tract.origin.smt, tract.origin.options);

    logger.verbose(">>> getEncoding");
    let encoding = {};
    // if not a filesystem based source and no transforms defined
    // then get source encoding
    if (jo.capabilities.encoding && !transforms.length) {
      let results = await jo.getEncoding();
      if (results.type === "encoding")
        encoding = results.data;
    }
    else {
      // if filesystem based source or transforms defined
      // then run some data through the codifier
      let pipes = [];

      let options = Object.assign({ max_read: tract.origin.options.max_read || 100 }, pattern);
      let reader = jo.createReader(options);
      reader.on('error', (error) => {
        logger.error("synchronize reader: " + error.message);
      });
      pipes.push(reader);

      for (let tfOptions of transforms)
        pipes.push(await jo.createTransform(tfOptions.transform, tfOptions));

      let ct = await jo.createTransform('codify');
      pipes.push(ct);

      await stream.pipeline(pipes);
      encoding = ct.encoding;
    }

    logger.verbose(">>> createReader");
    reader = jo.createReader(pattern);
    reader.on('error', (error) => {
      logger.error("synchronize reader: " + error.message);
    });

    logger.verbose(">>> origin transforms");
    for (let tfOptions of transforms) {
      let tfType = tfOptions.transform.split("-")[ 0 ];
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
        encoding = await jt.createSchema();
      }

      logger.verbose(">>> createWriter");
      let writer = jt.createWriter();
      writer.on('error', (error) => {
        logger.error("synchronize writer: " + error.message);
      });

      writer = reader.pipe(writer);
      writers.push(writer);
    }
    else {
      // sub-terminal tracts
      logger.verbose(">>> Terminal Tee");
      for (let branch of tract.terminal) {
        logger.verbose(">>> create branch junction " + branch.terminal.smt);
        let jt = await Storage.activate(branch.terminal.smt, branch.terminal.options);
        jtl.push(jt);

        if (!terminal.options.append && jt.capabilities.encoding) {
          logger.verbose(">>> createSchema");
          encoding = await jt.createSchema();
        }

        let writer = null;
        logger.verbose(">>> transforms");
        let transforms = branch.transforms || [];
        for (let tfOptions of transforms) {
          let tfType = tfOptions.transform.split("-")[ 0 ];
          let t = await jt.createTransform(tfType, tfOptions);
          writer = (writer) ? writer.pipe(t) : reader.pipe(t);
        }

        logger.verbose(">>> createWriter");
        // add terminal
        let w = jt.createWriter();
        w.on('error', (error) => {
          logger.error("synchronize writer: " + error.message);
        });

        writer = (writer) ? writer.pipe(w) : reader.pipe(w);
        writers.push(writer);
      }
    }

    logger.verbose(">>> wait on transfer");
    await stream.finished(reader);
    for (let writer of writers)
      await stream.finished(writer);

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
