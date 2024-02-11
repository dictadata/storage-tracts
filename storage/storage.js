/**
 * storage/storage-storage
 *
 * Static classes implementations.
 *
 *   StorageJunctions
 *   FileSystems
 *   Transforms
 *   Engrams
 */
"use strict";

const Storage = require("@dictadata/storage-junctions");
const Engrams = require("./engrams");

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
    if (typeof smt === "string" && smt.indexOf('|') < 0 && Engrams.engrams) {
      // lookup urn in Engrams
      let results = await Engrams.engrams.recall({
        match: {
          key: smt
        },
        resolve: true
      });
      if (results.status !== 0)
        throw new StorageError(results.status, results.message + ": " + smt);

      let entry = results.data[ smt ];
      _smt = entry.smt;
      if (entry.options)
        options = Object.assign({}, entry.options, options);
      if (!options.encoding && entry.fields)
        options.encoding = entry.fields;
    }
    else {
      // SMT string or object
      _smt = new SMT(smt);
    }

    return Storage.activate(_smt, options);
  }

}

module.exports = exports = StorageEtl;
