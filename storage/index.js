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

var Actions = exports.Actions = require('./actions');
Actions.use("list", require('./actions/list'));
Actions.use("schema", require('./actions/schema'));
Actions.use("codify", require('./actions/codify'));
Actions.use("scan", require('./actions/scan'));
Actions.use("foreach", require('./actions/foreach'));
Actions.use("transfer", require('./actions/transfer'));
Actions.use("retrieve", require('./actions/retrieve'));
Actions.use("dull", require('./actions/dull'));
Actions.use("copy", require('./actions/copy'));
Actions.use("engrams", require('./actions/engrams'));
Actions.use("tracts", require('./actions/tracts'));

Storage.Transforms.use("tee", require('./transforms/tee'));
