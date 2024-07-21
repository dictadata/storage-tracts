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

const { Fields } = require('@dictadata/storage-junctions/types');

module.exports = exports = class Entry extends Fields {

  /**
   * Entry class for a data directory
   *
   * @param {Object} encoding an object containing common entry properties.
   */
  constructor(encoding) {
    super(encoding);

    if (encoding.realm) this.realm = encoding.realm;
    if (encoding.name) this.name = encoding.name;

    if (encoding.type) this.type = encoding.type;
    if (encoding.source) this.source = encoding.source;

    if (encoding.description) this.description = encoding.description;

    if (encoding.roles) this.roles = encoding.roles;
    if (encoding.tags) this.tags = encoding.tags;

    if (encoding.footnote) this.footnote = encoding.footnote;
    if (encoding.notes) this.notes = encoding.notes;

    if (encoding.urn) this.urn = encoding.urn;
  }

  get urn() {
    if (this.realm)
      return this.realm + ":" + this.name;
    else
      return ":" + this.name;
  }

  set urn(value) {
    if (value.indexOf(":") < 0) {
      this.realm = "";
      this.name = value;
    }
    else {
      [ this.realm, this.name ] = value.split(':');
    }
  }
};
