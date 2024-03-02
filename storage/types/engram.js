/**
 * storage/types/engram.js
 *
 * engram definition
 */

"use strict";

const { Engram } = require('@dictadata/storage-junctions/types');
const Entry = require('./entry');

// Set the prototype chain of Engram to Entry, i.e.
//  class Engram extends Entry {}

Object.setPrototypeOf(Engram, Entry);
Object.setPrototypeOf(Engram.prototype, Entry.prototype);

function newEngram(encoding) {
  return Reflect.construct(Engram, [ encoding ]);
}

module.exports = exports = newEngram;
