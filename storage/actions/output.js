/**
 * storage/etl/output.js
 */
const { logger } = require('../utils');
const fs = require('fs');
const path = require('path');
const _compare = require('@dictadata/storage-junctions/test/lib/_compare');

module.exports = exports = (output, data, compareValues = 2) => {
  let retCode = 0;

  if (output && data) {
    logger.info("output saved to " + output);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(data, null, " "), "utf8");
  }

  if (process.env.NODE_ENV === "development") {
    // compare output
    let expected = output.replace("output", "expected");
    retCode = _compare(expected, output, compareValues);
  }

  return process.exitCode = retCode;
};
