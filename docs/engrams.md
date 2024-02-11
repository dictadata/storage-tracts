# class Engrams

Engrams is a data directory and dictionary of encoding definitions.

Encoding definitions:

* smt_urn - the key for addressing Engrams entries
* engram - SMT encoding definitions

An underlying StorageJunction such as ElasticsearchJunction can be used for permanent storage.
By default a simple cache is implemented with a Map.

## smt_urn is the Key

```javascript

class Engrams {

  /**
   *
   * @param { SMT }    smt an SMT string or SMT object where Engrams data will be located. This parameter can NOT be an SMT name.
   * @param { Object } options that will be passed to the underlying junction.
   */
  constructor(smt, options)

  /**
   *
   */
  get isActive()

  /**
   *
   */
  smt_urn(match)

  /**
   * Activate the Engrams
   *
   * @returns true if underlying junction was activated successfully
   */
  async activate()

  /**
   *
   */
  async relax()

  /**
   *
   * @param {*} entry Engram or encoding object with engrams properties
   * @returns
   */
  async store(entry)

  /**
   *
   * @param {*} name SMT name
   * @returns
   */
  async dull(pattern)

  /**
   *
   * @param {*} name SMT name
   * @returns
   */
  async recall(pattern)

  /**
   *
   * @param {*} pattern pattern object that contains query logic
   * @returns
   */
  async retrieve(pattern)

}
```
