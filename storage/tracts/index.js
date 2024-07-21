/**
 * storage/tracts
 *
 * Tracts is a data directory and dictionary of tract definitions.
 *
 * valid tracts types:
 *   tract  - ETL tract definition
 *   alias  -
 *
 * An underlying StorageJunction such as ElasticsearchJunction can be used for persistent storage.
 * A simple cache is implemented with a Map.
 */
"use strict";

const Storage = require('../storage');
const { SMT, Tract, StorageResults, StorageError } = require('@dictadata/storage-junctions/types');
const { logger } = require('@dictadata/lib');
const { objCopy, dot } = require('@dictadata/lib');
const { readFile } = require('node:fs/promises');

const homedir = process.env[ "HOMEPATH" ] || require('os').homedir();

const tracts_encoding = require('./tracts.engram.json');

const tractsTypes = [ "tract", "alias" ];

module.exports = exports = class Tracts {

  constructor() {
    this.smt;
    this.options;

    this.cache_enabled = false;
    this._tracts = new Map();
    this._active = false;
    this._junction = null;
  }

  get isActive() {
    return this._active;
  }

  urn(entry) {
    let urn;

    if (typeof entry === "string")
      urn = entry;
    else if (entry.key)
      urn = entry.key;
    else
      urn = (entry.realm ? entry.realm : "") + ":" + entry.name;

    if (urn.indexOf(":") < 0)
      urn = ":" + urn;
    /*
        // remove any fiber name
        let i = urn.lastIndexOf("#");
        if (i > 0)
          urn = urn.substring(0, i);
    */
    return urn;
  }

  /**
   * Activate the Tracts junction
   *
   * @param { SMT }    smt an SMT string or SMT object where tracts data will be located. This parameter can NOT be an SMT name!
   * @param { Object } options that will be passed to the underlying junction.
   * @returns true if underlying junction was activated successfully
   */
  async activate(smt, options) {
    this.smt = new SMT(smt);
    this.options = options || {};

    try {
      let options = Object.assign({}, this.options);
      if (!options.encoding)
        options.encoding = tracts_encoding;

      if (this.smt.key === "*") {
        // use default smt.key which is !realm+name
        let s = new SMT(tracts_encoding.smt);
        this.smt.key = s.key;
      }

      // check for auth options
      if (!options.auth && Storage.auth.has(this.smt.locus)) {
        let stash = Storage.auth.recall(this.smt.locus);
        options = Object.assign(options, stash);
      }

      // check to read certificate authorities from file
      let tls = options.tls || options.ssl;
      if (tls?.ca) {
        if (typeof tls.ca === "string" && !tls.ca.startsWith("-----BEGIN CERTIFICATE-----")) {
          // assume it's a filename
          if (tls.ca.startsWith("~"))
            tls.ca = homedir + tls.ca.substring(1);

          // replace ca with contents of file
          logger.verbose("ca: " + tls.ca);
          tls.ca = await readFile(tls.ca);
        }
      }

      // create the junction
      // Elasticsearch index config parameters
      //options.indexSettings = {}
      //dot.set(options.indexSettings, "index.mapping.depth.limit", 5);
      //dot.set(options.indexSettings, "index.mapping.total_fields.ignore_dynamic_beyond_limit", true);
      this._junction = await Storage.activate(this.smt, options);

      // attempt to create tracts schema
      let results = await this._junction.createSchema();
      if (results.status === 0) {
        logger.info("storage/tracts: created schema, " + this._junction.smt.schema);
      }
      else if (results.status === 409) {
        logger.debug("storage/tracts: schema exists");
      }
      else {
        throw new StorageError(500, "unable to create tracts schema");
      }
      this._active = true;
    }
    catch (err) {
      logger.error('storage/tracts: activate junction failed, ' + err.message || err);
    }

    return this._active;
  }

  async relax() {
    this._active = false;
    if (this._junction)
      await this._junction.relax();
  }

  /**
   *
   * @param {Object} entry Tracts object
   * @returns
   */
  async store(entry) {
    let storageResults = new StorageResults("message");

    // parameter checks
    // note: realm is optional
    if (!entry.name || entry.name === "*") {
      storageResults.setResults(400, "Invalid tracts name");
      return storageResults;
    }
    if (!entry.type || !tractsTypes.includes(entry.type)) {
      storageResults.setResults(400, "Invalid tracts type");
      return storageResults;
    }

    let urn = this.urn(entry);

    if (entry.type === "tract") {
      // make sure smt are strings
      for (let fiber of entry?.fibers) {
        if (typeof fiber.origin?.smt === "object") {
          let smt = new SMT(fiber.origin.smt);
          fiber.origin.smt = smt.toString();
        }
        if (typeof fiber.terminal?.smt === "object") {
          let smt = new SMT(fiber.terminal.smt);
          fiber.terminal.smt = smt.toString();
        }
      }
    }

    // save in cache
    if (this.cache_enabled)
      this._tracts.set(urn, objCopy({}, entry));

    if (!this._junction) {
      storageResults.setResults(500, "Tracts junction not activated");
      return storageResults;
    }

    // save in source tracts
    storageResults = await this._junction.store(entry, { key: urn });
    logger.verbose("storage/tracts: " + urn + ", " + storageResults.status);
    return storageResults;
  }

  /**
   *
   * @param {String|Object} urn tracts URN string or object
   * @param {String} urn.realm
   * @param {String} urn.name
   * @returns
   */
  async dull(urn) {
    let storageResults = new StorageResults("message");
    urn = this.urn(urn);

    if (this.cache_enabled && this._tracts.has(urn)) {
      // delete from cache
      if (!this._tracts.delete(urn)) {
        storageResults.setResults(500, "map delete error");
        return storageResults;
      }
    }

    if (!this._junction) {
      storageResults.setResults(500, "Tracts junction not activated");
      return storageResults;
    }

    // delete from Tracts source
    storageResults = await this._junction.dull({ key: urn });
    return storageResults;
  }

  /**
   *
   * @param {String|Object} urn tracts URN string or object
   * @param {String} urn.realm
   * @param {String} urn.name
   * @param {Boolean} resolve resolve aliases
   * @returns
   */
  async recall(urn, resolve = false) {
    let storageResults = new StorageResults("array");
    urn = this.urn(urn);
    let tract;

    if (this.cache_enabled && this._tracts.has(urn)) {
      // entry has been cached
      tract = this._tracts.get(urn);
      tract = objCopy({}, tract);
    }
    else {
      if (!this._junction) {
        storageResults.setResults(500, "Tracts junction not activated");
        return storageResults;
      }

      // go to the source tracts
      let results = await this._junction.recall({ key: urn });
      logger.verbose("storage/tracts: recall, " + results.status);
      if (results.status !== 0) {
        return results;
      }

      tract = results.data[ urn ];
      // cache entry definition
      if (this.cache_enabled)
        this._tracts.set(urn, objCopy({}, tract));
    }

    if (resolve && tract.type === "alias") {
      // recall the entry for the source urn
      return await this.recall(tract.source, false);
    }

    storageResults.add(tract);
    return storageResults;
  }

  /**
   *
   * @param {*} pattern query pattern for searching Tracts data source
   * @returns
   */
  async retrieve(pattern) {
    let storageResults = new StorageResults("array");

    if (!this._junction) {
      storageResults.setResults(500, "Tracts junction not activated");
      return storageResults;
    }

    // retrieve list from source tracts
    let results = await this._junction.retrieve(pattern);
    logger.verbose("storage/tracts: retrieve, " + results.status);
    if (results.status !== 0) {
      return results;
    }

    // current design does not cache entries from retrieved list

    for (let [ urn, entry ] of Object.entries(results.data))
      storageResults.add(entry);

    return storageResults;
  }
};
