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

const { Storage } = require('@dictadata/storage-junctions');
const { SMT, StorageError } = require('@dictadata/storage-junctions/types');

module.exports = exports = Storage;

// replace storage-junctions.activate function
var Storage_activate = Storage.activate;
Storage.activate = activateJunction;
Storage.activateJunction = activateJunction;
Storage.resolve = resolve;

/**
 * Create and activate a StorageJunction given an SMT.
 * Will do Engrams engram and auth lookups.
 *
 * @param {*} smt an SMT name, SMT string or SMT object
 * @param {*} options options to pass to the storage-junction
 * @returns
 */
async function activateJunction(smt, options, etl) {
  let _smt = {};
  if (!options) options = {};

  // lookup/verify SMT object
  if (typeof smt === "string" && smt.indexOf('|') < 0 && Storage.engrams?.isActive) {
    if (smt === "$:engrams") {
      _smt = Storage.engrams.smt;
      options = Storage.engrams.options;
    }
    else if (smt === "$:tracts" && Storage.tracts?.isActive) {
      _smt = Storage.tracts.smt;
      options = Storage.tracts.options;
    }
    else {
      // lookup urn in Engrams
      let results = await Storage.engrams.recall(smt, true);
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
  if (typeof smt === "string" && smt.indexOf('|') < 0 && Storage.engrams?.isActive) {
    if (smt === "$:engrams") {
      _smt = Storage.engrams.smt;
    }
    else if (smt === "$:tracts" && Storage.tracts?.isActive) {
      _smt = Storage.tracts.smt;
    }
    else {
      // lookup urn in Engrams
      let results = await Storage.engrams.recall(smt, true);
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
