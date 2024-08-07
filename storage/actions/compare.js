/**
 * storage/etl/compare
 */
"use strict";

const { logger } = require('@dictadata/lib');
const { dot } = require('@dictadata/lib');
const { compare } = require('@dictadata/lib/test');

const { readFile } = require('node:fs/promises');
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
      let expected = await readFile(fiber.expected, { encoding: 'utf8' });
      if (path.extname(fiber.expected) === '.gz')
        expected = unzipSync(expected);
      expected = JSON.parse(expected);
      expected = dot.get(expected, fiber.pick);

      let output = await readFile(fiber.output, { encoding: 'utf8' });
      if (path.extname(fiber.output) === '.gz')
        output = unzipSync(output);
      output = JSON.parse(output);
      output = dot.get(output, fiber.pick);

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
