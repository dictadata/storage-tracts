/**
 * storage/etl/processTract.js
 */
const { StorageError } = require("@dictadata/storage-junctions/types");
const config = require('./config');
const logger = require('./logger');

const list = require("./list");
const codify = require('./codify');
const foreach = require('./foreach');
const transfer = require('./transfer');
const dull = require('./dull');
const copy = require('./copy');
const codex = require('./codex');

/**
 *
 * @param {*} tractName
 * @param {*} tract
 */
module.exports = async (tractName, tract) => {
  if (typeof tract !== 'object')
    throw new StorageError(422, "storage tract not found " + tractName);

  let action = tract[ "action" ] || tractName.substr(0, tractName.indexOf('_')) || tractName;

  switch (action) {
    case 'config':
      // should never get here, see above 'config' code
      return config.createTracts();
    case 'list':
      return list(tract);
    case 'codify':
      return codify(tract);
    case 'foreach':
      return foreach(tract);
    case 'transfer':
      return transfer(tract);
    case 'dull':
      return dull(tract);
    case 'copy':
      return copy(tract);
    case 'codex':
      return codex(tract);
    default:
      logger.error("unknown action: " + action);
      return 1;
  }

};
