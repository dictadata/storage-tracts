/**
 * lib/upload
 * 
 * upload local file(s) directly to a remote file system.
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');
const path = require('path');

module.exports = exports = async function (tract) {
  var retCode = 0

  var local;
  var junction;
  try {
    logger.info(">>> create generic junction for local files");
    let uploads = path.parse(tract.origin.options.uploads);
    let smt = "*|" + uploads.dir + "/|" + uploads.base + "|*";
    logger.verbose("smt:" + JSON.stringify(smt, null, 2));
    local = await storage.activate(smt, tract.origin.options);

    logger.info(">>> get list of local files");
    let list = await local.list();

    logger.info(">>> create junction");
    logger.verbose("smt:" + JSON.stringify(tract.terminal.smt, null, 2));
    if (tract.terminal.options)
      logger.verbose("options:" + JSON.stringify(tract.terminal.options));
    junction = await storage.activate(tract.terminal.smt, tract.terminal.options);

    logger.info(">>> upload files");
    // download is a filesystem level method
    let stfs = await junction.getFileSystem();

    for (let entry of list) {
      logger.debug(JSON.stringify(entry, null, 2));

      let options = Object.assign({ uploadPath: uploads.dir + '\\' }, tract.origin.options, entry);
      let ok = await stfs.upload(options);
      if (!ok) {
        logger.error("!!! upload failed: " + entry.href);
        retCode = 1;
      }
    }

    logger.info(">>> completed");
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
};
