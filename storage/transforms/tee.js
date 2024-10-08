/**
 * storage/transforms/tee
 *
 * tee output to another fiber
 */
"use strict";

const Storage = require('../storage');
const { logger } = require('@dictadata/lib');
const { Transform } = require('node:stream');
const { readFile } = require('node:fs/promises');
const { pipeline, finished } = require('node:stream/promises');

module.exports = exports = class TeeTransform extends Transform {

  /**
   *
   * @param {*} options transform options
   */
  constructor(options) {
    let streamOptions = {
      objectMode: true,
      highWaterMark: 128
    };
    super(streamOptions);

    this.options = Object.assign({}, options);
    this._junction = options._junction;
    this.writer;
  }

  async _construct(callback) {

    let fiber = this.options.fiber;
    let terminal = fiber.terminal;
    if (!terminal.options) terminal.options = {};
    let transforms = fiber.transforms || [];

    // resolve urn
    if (typeof fiber?.urn === "string") {
      let results = await Storage.tracts.recall(fiber.urn);
      fiber = results.data[ 0 ].fibers[ 0 ];
    }

    if (typeof terminal.options?.encoding === "string") {
      let filename = terminal.options.encoding;
      terminal.options.encoding = JSON.parse(await readFile(filename, "utf8"));
    }

    // resolve terminal SMT
    logger.debug(">>> resolve terminal SMT");
    terminal.smt = await Storage.resolve(terminal.smt, terminal.options);

    /// setup pipeline
    logger.debug(">>> transfer pipeline");
    let pipes = [];

    // reader
    pipes.push(this);

    // transforms
    for (let transform of transforms) {
      let tfType = transform.transform;
      pipes.push(await Storage.activateTransform(tfType, transform));
    }

    // writer
    logger.debug(">>> terminal junction " + JSON.stringify(terminal.smt));
    let jt = await Storage.activate(terminal.smt, terminal.options);

    logger.debug("terminal schema");
    if (jt.capabilities.encoding && !terminal.options?.append) {
      logger.debug(">>> createSchema");
      let results = await jt.createSchema();
      if (results.status !== 0)
        logger.info("could not create storage schema: " + results.message);
    }

    // writer
    this.writer = jt.createWriter();
    //this.writer.on('error', (error) => {
    // logger.error("tee writer: " + error.message);
    //});
    pipes.push(this.writer);

    // start pipeline
    logger.debug(">>> start transfer");
    pipeline(pipes);

    callback();
  }

  /**
   * Calculate field statistics by examining construct(s).
   * Stores stats to this.engram.fields.
   *
   * @param {*} construct
   * @param {*} encoding
   * @param {*} callback
   */
  _transform(construct, encoding, callback) {
    logger.debug("tee _transform");

    try {
      // pass through
      this.push(construct);
    }
    catch (err) {
      logger.warn("tee error: " + err.message);
    }

    callback();
  }

  async _flush(callback) {
    logger.debug("tee _flush");

    // push some final object(s)
    //this.push(this._composition);

    //await finished(this.writer);

    callback();
  }

};
