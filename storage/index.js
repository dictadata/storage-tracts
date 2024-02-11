/**
 * @dictadata/storage-junctions
 *
 * Exposes Class types for:
 *   StorageJunction, FileSystems, Transforms
 *
 * Registers standard implementations of several:
 *   StorageJunctions, FileSystems, Transforms
 */
"use strict";

var Storage = require("./storage");
exports.Storage = Storage;

//////////
///// register Storage FileSystems
exports.Actions = require("./actions");
exports.Engrams = require("./engrams");
exports.Tracts = require("./tracts");
