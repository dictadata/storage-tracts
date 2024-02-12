/**
 * storage/types/entry.js
 *
 * Storage Entry
 *
 * An Engram (encoding) is a storage memory trace (SMT) plus field definitions.
 * Field definitions are needed to encode and decode constructs for storage.
 *
 * SMT and Engram represent the same concept, accessing a specific datastore,
 * and can sometimes be interchangeable as parameters.  For example if the field
 * definitions are not needed to access the datastore.
 *
 * Extra information about the datastore may be be stored in Engram properties such
 * as indices and source specific field properties needed to (re)create a schema.
 */
"use strict";

module.exports = exports = class Entry {

  /**
   * Entry class for a data directory
   *
   * @param {Object} options an object containing common entry properties.
   */
  constructor(options) {
    if (options.domain) this.domain = options.domain;
    if (options.name) this.name = options.name;

    if (options.type) this.type = options.type;
    if (options.source) this.source = options.source;

    if (options.title) this.title = options.title;
    if (options.description) this.description = options.description;

    if (options.roles) this.roles = options.roles;
    if (options.tags) this.tags = options.tags;

    if (options.notes) this.notes = options.notes;
  }

  get urn() {
    if (this.domain)
      return this.domain + ":" + this.name;
    else
      return ":" + this.name;
  }

};
