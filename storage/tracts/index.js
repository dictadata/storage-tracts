/**
 * storage/tracts
 *
 * Tracts is a data directory and dictionary of tract definitions.
 *
 * valid tracts types:
 *   tract  - ETL tract definitions
 *   alias  -
 *
 * An underlying StorageJunction such as ElasticsearchJunction can be used for persistent storage.
 * A simple cache is implemented with a Map.
 */
"use strict";

const Storage = require("../storage");
const { SMT, Tract, StorageResults, StorageError } = require("@dictadata/storage-junctions/types");
const { hasOwnProperty, logger } = require("@dictadata/storage-junctions/utils");
const fs = require("node:fs");
const homedir = process.env[ "HOMEPATH" ] || require('os').homedir();

const tracts_encoding = require("./tracts.encoding.json");

const tractsTypes = [ "tract", "alias" ];

module.exports = exports = class Tracts {

  constructor() {
    this.smt;
    this.options;

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
      urn = (entry.domain ? entry.domain : "") + ":" + entry.name;

    if (urn.indexOf(":") < 0)
      urn = ":" + urn;

    // remove any tract name
    let i = urn.lastIndexOf("#");
    if (i > 0)
      urn = urn.substring(0, i);

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
        // use default smt.key which is !domain+name
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
          tls.ca = fs.readFileSync(tls.ca);
        }
      }

      // create the junction
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
      logger.error('storage/tracts: activate junction failed, ', err.message || err);
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
    // note: domain is optional
    if (!entry.name || entry.name === "*") {
      storageResults.setResults(400, "Invalid tracts name" );
      return storageResults;
    }
    if (!entry.type || !tractsTypes.includes(entry.type)) {
      storageResults.setResults(400, "Invalid tracts type" );
      return storageResults;
    }

    let key = this.urn(entry);

    // make sure smt are strings
    if (entry.type === "tract") {
      for (let tract of entry?.tracts) {
        if (typeof tract.origin?.smt === "object") {
          let smt = new SMT(tract.origin.smt);
          tract.origin.smt = smt.toString();
        }
        if (typeof tract.terminal?.smt === "object") {
          let smt = new SMT(tract.terminal.smt);
          tract.terminal.smt = smt.toString();
        }
      }
    }

    // save in cache
    this._tracts.set(key, entry);

    if (this._junction) {
      // save in source tracts
      storageResults = await this._junction.store(entry, { key: key });
      logger.verbose("storage/tracts: " + key + ", " + storageResults.status);
      return storageResults;
    }

    storageResults.setResults(500, "Tracts junction not activated");
    return storageResults;
  }

  /**
   *
   * @param {String|Object} urn tracts URN string or object
   * @param {String} urn.domain
   * @param {String} urn.name
   * @returns
   */
  async dull(urn) {
    let storageResults = new StorageResults("message");
    urn = this.urn(urn);

    if (this._tracts.has(urn)) {
      // delete from cache
      if (!this._tracts.delete(urn)) {
        storageResults.setResults(500, "map delete error");
        return storageResults;
      }
    }

    if (this._junction) {
      // delete from source tracts
      storageResults = await this._junction.dull({ key: urn });
      return storageResults;
    }

    storageResults.setResults(500, "Tracts junction not activated");
    return storageResults;
  }

  /**
   *
   * @param {String|Object} urn tracts URN string or object
   * @param {String} urn.domain
   * @param {String} urn.name
   * @param {Boolean} resolve resolve aliases
   * @returns
   */
  async recall(urn, resolve = false) {
    let storageResults = new StorageResults("map");
    urn = this.urn(urn);

    if (this._tracts.has(urn)) {
      // entry has been cached
      let entry = this._tracts.get(urn);
      storageResults.add(entry, urn);
    }
    else if (this._junction) {
      // go to the source tracts
      storageResults = await this._junction.recall({ key: urn });
      logger.verbose("storage/tracts: recall, " + storageResults.status);
    }
    else {
      storageResults.setResults(404, "Not Found");
    }

    if (storageResults.status === 0 && resolve) {
      // check for alias smt
      let entry = storageResults.data[ urn ];
      if (entry.type === "alias") {
        // recall the entry for the source urn
        let results = await this._junction.recall(entry.source, resolve);

        // return source value, NOTE: not the alias value
        if (results.status === 0)
          storageResults.data[ urn ] = results.data[ entry.source ];
      }
    }

    if (storageResults.status === 0 && !resolve) {
      // cache tracts definition
      let entry = storageResults.data[ urn ];
      if (urn === this.urn(entry)) // double check it wasn't an alias lookup
        this._tracts.set(urn, entry);
    }

    return storageResults;
  }

  /**
   *
   * @param {*} pattern query pattern for searching Tracts data source
   * @returns
   */
  async retrieve(pattern) {
    let storageResults = new StorageResults("message");

    if (this._junction) {
      // current design does not cache entries from retrieved list

      // retrieve list from source tracts
      storageResults = await this._junction.retrieve(pattern);
      logger.verbose("storage/tracts: retrieve, " + storageResults.status);
    }
    else {
      storageResults.setResults(503, "Tracts Unavailable");
    }

    return storageResults;
  }
};