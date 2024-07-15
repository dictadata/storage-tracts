/**
 * @dictadata/storage-tracts
 *
 * Exposes Class types for:
 *   StorageJunction, FileSystems, Transforms
 *
 * Registers standard implementations of several:
 *   StorageJunctions, FileSystems, Transforms
 */

const Storage = require('./storage');
const Actions = require('./actions');
const Engrams = require('./engrams');
const Tracts = require('./tracts');

Storage.engrams = new Engrams();
Storage.tracts = new Tracts();

Storage.Transforms.use("tee", require('./transforms/tee'));

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

exports.Storage = Storage;
exports.Actions = Actions;
exports.Engrams = Storage.engram;
exports.Tracts = Storage.tracts;
