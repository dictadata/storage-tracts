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

/**
 * Create and activate a StorageJunction given an SMT.
 * Will do Engrams engram and auth lookups.
 *
 * @param {*} smt an SMT name, SMT string or SMT object
 * @param {*} options options to pass to the storage-junction
 * @returns
 */
async function activate(smt, options, etl) {
  let _smt = {};
  if (!options) options = {};

  // lookup/verify SMT object
  if (typeof smt === "string" && smt.indexOf('|') < 0 && StorageEtl.engrams?.isActive) {
    if (smt === "$:engrams") {
      _smt = StorageEtl.engrams.smt;
      options = StorageEtl.engrams.options;
    }
    else if (smt === "$:tracts" && StorageEtl.tracts?.isActive) {
      _smt = StorageEtl.tracts.smt;
      options = StorageEtl.tracts.options;
    }
    else {
      // lookup urn in Engrams
      let results = await StorageEtl.engrams.recall(smt, true);
      if (results.status !== 0)
        throw new StorageError(results.status, results.message + ": " + smt);

      let entry = results.data[ 0 ];
      _smt = entry.smt;
      if (entry.options)
        options = Object.assign({}, entry.options, options);
      if (!options.encoding)
        options.encoding = entry;
    }
  }
  else {
    // SMT string or object
    _smt = new SMT(smt);
  }

  return Storage_activate(_smt, options);
}

/**
 *
 * @param {*} smt smt to resolve
 * @param {*} options options may be updated
 * @returns
 */
async function resolve(smt, options) {
  let _smt = {};
  if (typeof options !== "object")
    throw new StorageError(400, "invalid/missing argument: options");

  // lookup/verify SMT object
  if (typeof smt === "string" && smt.indexOf('|') < 0 && StorageEtl.engrams?.isActive) {
    if (smt === "$:engrams") {
      _smt = StorageEtl.engrams.smt;
    }
    else if (smt === "$:tracts" && StorageEtl.tracts?.isActive) {
      _smt = StorageEtl.tracts.smt;
    }
    else {
      // lookup urn in Engrams
      let results = await StorageEtl.engrams.recall(smt, true);
      if (results.status !== 0)
        throw new StorageError(results.status, results.message + ": " + smt);

      let entry = results.data[ 0 ];
      _smt = entry.smt;
      if (entry.options)
        Object.assign(options, entry.options);
      if (!options.encoding)
        options.encoding = entry;
    }
  }
  else {
    // SMT string or object
    _smt = new SMT(smt);
  }

  return _smt;
}

class StorageEtl extends Storage {}

// replace storage-junctions.activate function
var Storage_activate = Storage.activate;
Storage.activate = activate;

//StorageEtl.activate = activate;  // redundant, but would only set StorageElt.activate
StorageEtl.resolve = resolve;
StorageEtl.engrams = null;
StorageEtl.tracts = null;


module.exports = exports = StorageEtl;
