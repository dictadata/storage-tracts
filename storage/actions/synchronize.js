/**
 * storage/etl/synchronize
 * BROKEN!
 * not fully implemented, needs to be redesigned
 */
"use strict";

const Storage = require("../storage");

const { pipeline, finished } = require('node:stream/promises');

/**
 *
 */
module.exports = async (fiber) => {
  logger.verbose("synchronize ...");
  let retCode = 0;

  var jo;
  var jtl = [];
  try {
    let reader = null;
    let writers = [];

    let pattern = Object.assign({ match: {} },
      fiber.origin.pattern);

    // what is fiber.state ???
    pattern.match[ fiber.state.field ] = {
      "gt": fiber.state.value
    };

    let transforms = fiber.transforms || [];

    logger.verbose(">>> Origin Tract");
    if (!fiber.origin.options) fiber.origin.options = {};
    if (!fiber.terminal.options) fiber.terminal.options = {};

    logger.verbose(">>> create origin junction " + fiber.origin.smt);
    jo = await Storage.activate(fiber.origin.smt, fiber.origin.options);

    logger.verbose(">>> getEngram");
    let encoding = {};
    // if not a filesystem based source and no transforms defined
    // then get source encoding
    if (jo.capabilities.encoding && !transforms.length) {
      let results = await jo.getEngram();
      if (results.type === "engram")
        encoding = results.data;
    }
    else {
      // if filesystem based source or transforms defined
      // then run some data through the codifier
      let pipes = [];

      let options = { max_read: fiber.origin.options.max_read || 100, pattern };
      let reader = jo.createReader(options);
      reader.on('error', (error) => {
        logger.error("synchronize reader: " + error.message);
      });
      pipes.push(reader);

      for (let transform of transforms)
        pipes.push(await jo.createTransform(transform.transform, transform));

      let ct = await jo.createTransform("codify", fiber);
      pipes.push(ct);

      await pipeline(pipes);
      encoding = ct.encoding;
    }

    logger.verbose(">>> createReader");
    reader = jo.createReader({ pattern });
    reader.on('error', (error) => {
      logger.error("synchronize reader: " + error.message);
    });

    logger.verbose(">>> origin transforms");
    for (let transform of transforms) {
      let tfType = transform.transform;
      reader = reader.pipe(await jo.createTransform(tfType, transform));
    }

    if (!fiber.terminal.options.encoding) {
      // use origin encoding
      fiber.terminal.options.encoding = encoding;
    }

    if (!Array.isArray(fiber.terminal)) {
      // a single terminal object
      logger.verbose(">>> Terminal Tract");
      let terminal = fiber.terminal;

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
      for (let branch of fiber.terminal) {
        logger.verbose(">>> create branch junction " + branch.terminal.smt);
        let jt = await Storage.activate(branch.terminal.smt, branch.terminal.options);
        jtl.push(jt);

        if (!branch.terminal.options.append && jt.capabilities.encoding) {
          logger.verbose(">>> createSchema");
          encoding = await jt.createSchema();
        }

        let writer = null;
        logger.verbose(">>> transforms");
        let transforms = branch.transforms || [];
        for (let transform of transforms) {
          let tfType = transform.transform;
          let t = await jt.createTransform(tfType, transform);
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
