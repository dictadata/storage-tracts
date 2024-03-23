/**
 * storage/etl/output.js
 */
const _compare = require('@dictadata/storage-junctions/test/lib/_compare');
const logger = require('./logger.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = exports = (output, data, compareValues = 2) => {
  let retCode = 0;

  if (typeof output === "string") {
    if (data) {
      logger.info("output saved to " + output);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, JSON.stringify(data, null, " "), "utf8");
    }

    if (process.env.NODE_ENV === "development") {
      // compare output
      let expected = output.replace("output", "expected");
      retCode = _compare(output, expected, compareValues);
    }
  }
  else if (output && output.writable) {
    output.write(JSON.stringify(data, null, 2));
  }

  return process.exitCode = retCode;
};
