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
module.exports = exports = async (fiber) => {
  logger.verbose("compare ...");
  let retCode = 0;

  try {
    if (fiber.pick) {
      // compare json objects

      // read files
      let expected = fs.readFileSync(fiber.expected, { encoding: 'utf8' });
      if (path.extname(fiber.expected) === '.gz')
        expected = unzipSync(expected);
      expected = JSON.parse(expected);
      expected = dot.get(fiber.pick, expected);

      let output = fs.readFileSync(fiber.output, { encoding: 'utf8' });
      if (path.extname(fiber.output) === '.gz')
        output = unzipSync(output);
      output = JSON.parse(output);
      output = dot.get(fiber.pick, output);

      // choose parser
      return compare.JSON(expected, output, fiber.compareValues);
    }
    else {
      retCode = compare.Files(fiber.expected, fiber.output, fiber.compareValues);
    }

  }
  catch (err) {
    logger.error(err);
    retCode = 1;
  }

  return retCode;
};
