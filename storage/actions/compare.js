/**
 * storage/etl/compare
 */
"use strict";

const compare = require('@dictadata/storage-junctions/test/lib/_compare');
const dot = require('@dictadata/storage-junctions/utils');
const { logger } = require('../utils');

const fs = require('node:fs');
const path = require('node:path');
const { unzipSync } = require('node:zlib');

/**
 *
 */
module.exports = async (action) => {
  logger.verbose("compare ...");
  let retCode = 0;

  try {
    if (action.pick) {
      // compare json objects

      // read files
      let expected = fs.readFileSync(action.expected, { encoding: 'utf8' });
      if (path.extname(action.expected) === '.gz')
        expected = unzipSync(expected);
      expected = JSON.parse(expected);
      expected = dot.get(action.pick, expected);

      let output = fs.readFileSync(action.output, { encoding: 'utf8' });
      if (path.extname(action.output) === '.gz')
        output = unzipSync(output);
      output = JSON.parse(output);
      output = dot.get(action.pick, output);

      // choose parser
      return compare.JSON(expected, output, action.compareValues);
    }
    else {
      retCode = compare.Files(action.expected, action.output, action.compareValues);
    }

  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
};
