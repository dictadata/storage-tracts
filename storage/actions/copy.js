/**
 * lib/copy
 *
 * copy file(s) between remote file system and local filesystem.
 */
"use strict";

const { Storage } = require("@dictadata/storage-junctions");
const { SMT, StorageError } = require('@dictadata/storage-junctions/types');
const { logger } = require('./logger');

function prefix(locus) {
  let p = 'file';
  let i = locus.indexOf(':');
  if (i > 0)
    p = locus.substr(0, i);
  return p;
}

module.exports = exports = async function (tract) {
  let retCode = 0;

  try {
    // verify that one of the destinations is local file system.
    let src_smt = new SMT(tract.origin.smt);
    let dst_smt = new SMT(tract.terminal.smt);

    let src_prefix = prefix(src_smt.locus);
    let dst_prefix = prefix(dst_smt.locus);

    if (src_prefix === 'file' && dst_prefix === 'file') {
      if (src_smt.schema !== '*')
        await download(tract);
      else
        await upload(tract);
    }
    else if (src_prefix === 'file') {
      await upload(tract);
    }
    else if (dst_prefix === 'file') {
      await download(tract);
    }
    else {
      throw new StorageError(400, "source and/or destination locus must be local file system");
    }

  }
  catch (err) {
    logger.error('!!! request failed: ' + err.message);
    retCode = 1;
  }

  return retCode;
};

async function download(tract) {
  let retCode = 0;

  var junction;
  try {
    logger.info("=== download");

    logger.verbose("smt:" + JSON.stringify(tract.origin.smt, null, 2));
    if (tract.origin.options)
      logger.verbose("options:" + JSON.stringify(tract.origin.options));

    logger.verbose(">>> activate junction");
    junction = await Storage.activate(tract.origin.smt, tract.origin.options);

    logger.verbose(">>> get list of desired files");
    let list;
    if (junction.smt.schema.includes('*') || junction.smt.schema.includes('?'))
      // wildcard
      ({ data: list } = await junction.list());
    else
      // single file
      list = [ { name: junction.smt.schema, rpath: junction.smt.schema } ];

    logger.verbose(">>> download files");
    // download is a filesystem level method
    let stfs = await junction.getFileSystem();

    for (let entry of list) {
      logger.info(entry.name);
      logger.verbose(JSON.stringify(entry, null, 2));

      let options = Object.assign({ smt: tract.terminal.smt, entry: entry }, tract.terminal.options);
      let ok = await stfs.getFile(options);
      if (!ok) {
        logger.error("download failed: " + entry.href);
        retCode = 1;
      }
    }

    logger.info("=== completed");
  }
  catch (err) {
    logger.error('!!! request failed: ' + err.message);
    retCode = 1;
  }
  finally {
    await junction.relax();
  }

  return retCode;
}

async function upload(tract) {
  var retCode = 0;

  var local;
  var junction;
  try {
    logger.info("=== upload");

    logger.verbose(">>> create generic junction for local files");
    logger.verbose("smt:" + JSON.stringify(tract.origin.smt, null, 2));
    local = await Storage.activate(tract.origin.smt, tract.origin.options);

    logger.verbose(">>> get list of local files");
    let { data: list } = await local.list();

    logger.verbose(">>> create terminal junction " + tract.terminal.smt);
    logger.verbose("smt:" + JSON.stringify(tract.terminal.smt, null, 2));
    if (tract.terminal.options)
      logger.verbose("options:" + JSON.stringify(tract.terminal.options));
    junction = await Storage.activate(tract.terminal.smt, tract.terminal.options);

    logger.verbose(">>> upload files");
    // download is a filesystem level method
    let stfs = await junction.getFileSystem();

    for (let entry of list) {
      logger.info(entry.name);
      logger.debug(JSON.stringify(entry, null, 2));

      let options = Object.assign({ smt: tract.origin.smt, entry: entry }, tract.origin.options);
      let ok = await stfs.putFile(options);
      if (!ok) {
        logger.error("!!! upload failed: " + entry.href);
        retCode = 1;
      }
    }

    logger.info("=== completed");
  }
  catch (err) {
    logger.error('!!! request failed: ' + err.message);
    retCode = 1;
  }
  finally {
    await local.relax();
    await junction.relax();
  }

  return retCode;
}
