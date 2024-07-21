/**
 * storage/engrams
 *
 * Engrams is a data directory and dictionary of engram definitions.
 *
 * valid engrams types:
 *   engram - SMT encoding definitions
 *   alias  -
 *
 * An underlying StorageJunction such as ElasticsearchJunction can be used for persistent storage.
 * A simple cache is implemented with a Map.
 */
"use strict";

const Storage = require('../storage');
const { Engram } = require('../types');
const { SMT, StorageResults, StorageError } = require('@dictadata/storage-junctions/types');
const { logger } = require('@dictadata/lib');
const { objCopy, dot } = require('@dictadata/lib');
const { readFile } = require('node:fs/promises');

const homedir = process.env[ "HOMEPATH" ] || require('os').homedir();

const engrams_encoding = require('./engrams.engram.json');

const engramsTypes = [ "engram", "alias" ];

module.exports = exports = class Engrams {

  constructor() {
    this.smt;
    this.options;

    this.cache_enabled = false;
    this._engrams = new Map();
    this._active = false;
    this._junction = null;
  }

  get isActive() {
    return this._active;
  }

  urn(entry) {
    let _urn;

    if (typeof entry === "string") {
      _urn = entry;
    }
    else if (typeof entry === "object") {
      if (Object.hasOwn(entry, "urn")) {
        _urn = entry.urn;
      }
      else {
        // get key using smt.key definition
        //   |*|*|*|=name1+'literal'+name2+...
        //   |*|*|*|!name1+'literal'+name2+...
        _urn = '';
        let keys = this.smt.key.substring(1).split('+');
        for (let name of keys) {
          if (name && name[ 0 ] === "'") {
            _urn += name.substr(1, name.length - 2);  // strip quotes
          }
          else {
            if (Object.hasOwn(entry, name) && entry[ name ])
              _urn += entry[ name ];
          }
        }
      }
    }

    if (_urn.indexOf(":") < 0)
      _urn = ":" + _urn;

    return _urn;
  }

  /**
   * Activate the Engrams junction
   *
   * @param { SMT }    smt an SMT string or SMT object where Engrams data will be located. This parameter can NOT be an SMT name!
   * @param { Object } options that will be passed to the underlying junction.
   * @returns true if underlying junction was activated successfully
   */
  async activate(smt, options) {
    this.smt = new SMT(smt);
    this.options = options || {};

    try {
      let options = Object.assign({}, this.options);
      if (!options.encoding)
        options.encoding = engrams_encoding;

      if (this.smt.key === "*") {
        // use default smt.key
        let s = new SMT(engrams_encoding.smt);
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
      //dot.set(options.indexSettings, "index.mapping.depth.limit", 10);
      this._junction = await Storage.activate(this.smt, options);

      // attempt to create engrams schema
      let results = await this._junction.createSchema();
      if (results.status === 0) {
        logger.info("storage/engrams: activate created schema, " + this._junction.smt.schema);
      }
      else if (results.status === 409) {
        logger.debug("storage/engrams: activate schema exists");
      }
      else {
        throw new StorageError(500, "unable to create engrams schema");
      }
      this._active = true;
    }
    catch (err) {
      logger.error('storage/engrams: activate junction failed, ' + err.message || err);
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
   * @param {Object} entry Engram or encoding object with Engrams Entry properties
   * @returns
   */
  async store(entry) {
    let storageResults = new StorageResults("message");

    // parameter checks
    // note: realm is optional
    if (!entry.name || entry.name === "*") {
      storageResults.setResults(400, "Invalid encoding name");
      return storageResults;
    }
    if (!entry.type || !engramsTypes.includes(entry.type)) {
      storageResults.setResults(400, "Invalid engrams type");
      return storageResults;
    }

    let encoding = entry.fieldsMap ? entry.encoding : entry;
    let urn = this.urn(encoding);

    // save in cache
    if (this.cache_enabled)
      this._engrams.set(urn, objCopy({}, encoding));

    if (!this._junction) {
      storageResults.setResults(500, "Engrams junction not activated");
      return storageResults;
    }

    // save in engrams
    storageResults = await this._junction.store(encoding, { key: urn });
    logger.debug("storage/engrams: store, " + urn + ", " + storageResults.status);
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

    if (this.cache_enabled && this._engrams.has(urn)) {
      // delete from cache
      if (!this._engrams.delete(urn)) {
        storageResults.setResults(500, "map delete error");
        return storageResults;
      }
    }

    if (!this._junction) {
      storageResults.setResults(500, "Engrams junction not activated");
      return storageResults;
    }

    // delete from Engrams source
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
    let engram;

    if (this.cache_enabled && this._engrams.has(urn)) {
      // entry has been cached
      engram = objCopy({}, this._engrams.get(urn));
    }
    else {
      if (!this._junction) {
        storageResults.setResults(500, "Engrams junction not activated");
        return storageResults;
      }

      let results = await this._junction.recall({ key: urn });
      logger.debug("storage/engrams: recall, " + results.status);
      if (results.status !== 0) {
        return results;
      }

      engram = results.data[ urn ];
      // cache entry definition
      if (this.cache_enabled)
        this._engrams.set(urn, objCopy(engram));
    }

    if (resolve && engram.type === "alias") {
      // recall the entry for the source urn
      return await this.recall(engram.source, false);
    }

    storageResults.add(engram);
    return storageResults;
  }

  /**
   *
   * @param {*} pattern query pattern for searching Engrams data source
   * @returns
   */
  async retrieve(pattern) {
    let storageResults = new StorageResults("array");

    if (!this._junction) {
      storageResults.setResults(500, "Engrams junction not activated");
      return storageResults;
    }

    // retrieve list from engrams
    let results = await this._junction.retrieve(pattern);
    logger.debug("storage/engrams: retrieve, " + results.status);
    if (results.status !== 0) {
      return results;
    }

    // current design does not cache entries from retrieved list

    for (let [ urn, entry ] of Object.entries(results.data))
      storageResults.add(entry);

    return storageResults;
  }
};
