/**
 * lib/download
 * 
 * download file(s) from remote filesystem directly to local folder.
 */
"use strict";

const storage = require("@dictadata/storage-junctions");
const logger = require('./logger');


module.exports = exports = async function (tract) {

  logger.info(">>> create junction");
  logger.verbose("smt:" + JSON.stringify(tract.origin.smt, null, 2));
  if (tract.origin.options)
    logger.verbose("options:" + JSON.stringify(tract.origin.options));

  var junction;
  try {
    logger.info("=== activate junction and filesystem");
    junction = await storage.activate(tract.origin.smt, tract.origin.options);

    logger.info("=== get list of desired files");
    let list = await junction.list();

    logger.info("=== download files");
    // download is a filesystem level method
    let stfs = await junction.getFileSystem();

    for (let entry of list) {
      logger.verbose(JSON.stringify(entry, null, 2));

      let options = Object.assign({}, tract.terminal.options, entry);
      let ok = await stfs.download(options);
      if (!ok)
        logger.error("download failed: " + entry.href);
    }
  }
  catch (err) {
    logger.error('!!! request failed: ' + err.message);
  }
  finally {
    await junction.relax();
  }

};
