/**
 * @dictadata/storage-tracts
 *
 * Exposes Class types for:
 *   StorageJunction, FileSystems, Transforms
 *
 * Registers standard implementations of several:
 *   StorageJunctions, FileSystems, Transforms
 */

var Storage = require('./storage');
exports.Storage = Storage;

//////////
///// register Storage FileSystems
exports.Engrams = require('./engrams');
Storage.engrams = new exports.Engrams();

exports.Tracts = require('./tracts');
Storage.tracts = new exports.Tracts();

exports.Actions = require('./actions');
exports.Actions.use("list", require('./actions/list'));
exports.Actions.use("schema", require('./actions/schema'));
exports.Actions.use("codify", require('./actions/codify'));
exports.Actions.use("scan", require('./actions/scan'));
exports.Actions.use("foreach", require('./actions/foreach'));
exports.Actions.use("transfer", require('./actions/transfer'));
exports.Actions.use("tee", require('./actions/tee'));
exports.Actions.use("retrieve", require('./actions/retrieve'));
exports.Actions.use("dull", require('./actions/dull'));
exports.Actions.use("copy", require('./actions/copy'));
exports.Actions.use("engrams", require('./actions/engrams'));
exports.Actions.use("tracts", require('./actions/tracts'));
