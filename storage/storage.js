/**
 * storage/storage-tracts
 *
 * Static classes implementations.
 *
 *   StorageJunctions
 *   FileSystems
 *   Transforms
 *   Engrams
 */
"use strict";

const { Storage } = require("@dictadata/storage-junctions");
const { SMT, StorageError } = require("@dictadata/storage-junctions/types");

class StorageEtl extends Storage {

  /**
   * Create and activate a StorageJunction given an SMT.
   * Will do Engrams engram and auth lookups.
   *
   * @param {*} smt an SMT name, SMT string or SMT object
   * @param {*} options options to pass to the storage-junction
   * @returns
   */
  static async activate(smt, options) {
    let _smt = {};
    if (!options) options = {};

    // lookup/verify SMT object
    if (typeof smt === "string" && smt.indexOf('|') < 0 && StorageEtl.engrams?.isActive) {
      // lookup urn in Engrams
      let results = await StorageEtl.engrams.recall(smt, true);
      if (results.status !== 0)
        throw new StorageError(results.status, results.message + ": " + smt);

      let entry = results.data[ 0 ];
      _smt = entry.smt;
      if (entry.options)
        options = Object.assign({}, entry.options, options);
      if (!options.encoding && entry.fields && entry.fields.length)
        options.encoding = { fields: entry.fields };
    }
    else {
      // SMT string or object
      _smt = new SMT(smt);
    }

    return Storage.activate(_smt, options);
  }

  /**
   *
   * @param {*} smt smt to resolve
   * @param {*} options options may be updated
   * @returns
   */
  static async resolve(smt, options) {
    let _smt = {};
    if (typeof options !== "object")
      throw new StorageError(400, "invalid/missing argument: options");

    // lookup/verify SMT object
    if (typeof smt === "string" && smt.indexOf('|') < 0 && StorageEtl.engrams?.isActive) {
      // lookup urn in Engrams
      let results = await StorageEtl.engrams.recall(smt, true);
      if (results.status !== 0)
        throw new StorageError(results.status, results.message + ": " + smt);

      let entry = results.data[ 0 ];
      _smt = entry.smt;
      if (entry.options)
        Object.assign(options, entry.options);
      if (!options.encoding && entry.fields && entry.fields.length)
        options.encoding = { fields: entry.fields };
    }
    else {
      // SMT string or object
      _smt = new SMT(smt);
    }

    return _smt;
  }
}

StorageEtl.engrams = null;
StorageEtl.tracts = null;

module.exports = exports = StorageEtl;
