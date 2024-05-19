/**
 * storage/utils/findFile.js
 */
const { access, constants } = require("node:fs/promises");
const { join, parse, format, sep } = require("node:path");
const { cwd } = require("node:process");

/**
 * Walk up directory tree searching for filename.
 *
 * @param {string} filename - [relative path][/]filename
 */
module.exports = exports = async (filename) => {
  let filepath = join(cwd(), filename);
  let found = false;
  let dp = parse(filepath)

  while (!found) {

    try {
      // Check if filepath is readable.
      await access(filepath, constants.R_OK);
      found = true;
    }
    catch (err) {
      if (dp.dir !== "") {
        // remove a directory
        let dirs = dp.dir.split(sep);
        dirs.length--;
        dp.dir = dirs.join(sep);

        filepath = format(dp);
      }
    }

    if (dp.dir === "")
      break;
  }

  return found ? filepath : "";
};
