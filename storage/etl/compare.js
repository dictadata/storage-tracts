/**
 * storage/etl/compare
 */
"use strict";

const compare = require('@dictadata/storage-junctions/test/lib/_compare');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');
const { unzipSync } = require('zlib');
const dot = require('dot-object');

/**
 *
 */
module.exports = async (tract) => {
  logger.verbose("compare ...");
  let retCode = 0;

  try {
    if (tract.extract) {
      // compare json objects

      // read files
      let expected = fs.readFileSync(tract.expected, { encoding: 'utf8' });
      if (path.extname(tract.expected) === '.gz')
        expected = unzipSync(expected);
      expected = JSON.parse(expected);
      expected = dot.pick(tract.extract, expected);

      let output = fs.readFileSync(tract.output, { encoding: 'utf8' });
      if (path.extname(tract.output) === '.gz')
        output = unzipSync(output);
      output = JSON.parse(output);
      output = dot.pick(tract.extract, output);

      // choose parser
      return compare.JSON(expected, output, tract.compareValues);
    }
    else {
      retCode = compare.Files(tract.expected, tract.output, tract.compareValues);
    }

  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
};
