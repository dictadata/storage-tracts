/**
 * storage/types/tract.js
 *
 * tract definition
 */

"use strict";

const Entry = require('./entry');

module.exports = exports = class Tract extends Entry {

  constructor(options) {
    super(options);
    this.type = "tract";
    this.actions = options.actions || [];
  }

};
