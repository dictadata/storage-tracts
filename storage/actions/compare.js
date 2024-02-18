/**
 * storage/etl/compare
 */
"use strict";

const compare = require('@dictadata/storage-junctions/test/lib/_compare');
const { logger } = require('../utils');
const fs = require('fs');
const path = require('path');
const { unzipSync } = require('zlib');
const dot = require('dot-object');

/**
 *
 */
module.exports = async (action) => {
  logger.verbose("compare ...");
  let retCode = 0;

  try {
    if (action.extract) {
      // compare json objects

      // read files
      let expected = fs.readFileSync(action.expected, { encoding: 'utf8' });
      if (path.extname(action.expected) === '.gz')
        expected = unzipSync(expected);
      expected = JSON.parse(expected);
      expected = dot.pick(action.extract, expected);

      let output = fs.readFileSync(action.output, { encoding: 'utf8' });
      if (path.extname(action.output) === '.gz')
        output = unzipSync(output);
      output = JSON.parse(output);
      output = dot.pick(action.extract, output);

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
