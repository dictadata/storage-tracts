/**
 * @dictadata/storage-tracts
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
exports.Engrams = require("./engrams");
Storage.engrams = new exports.Engrams();

exports.Tracts = require("./tracts");
Storage.tracts = new exports.Tracts();

exports.Actions = require("./actions");
exports.Actions.use("list", require("./actions/list"));
exports.Actions.use("create", require('./actions/create'));
exports.Actions.use("codify", require('./actions/codify'));
exports.Actions.use("scan", require('./actions/scan'));
exports.Actions.use("iterate", require('./actions/iterate'));
exports.Actions.use("transfer", require('./actions/transfer'));
exports.Actions.use("dull", require('./actions/dull'));
exports.Actions.use("copy", require('./actions/copy'));
exports.Actions.use("engrams", require('./actions/engrams'));
exports.Actions.use("tracts", require('./actions/tracts'));
