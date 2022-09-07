# Data Synchronization

## By Timestamp or Sequential Identity

If the data schema has a field(s) that is sequential then that field can be used to retrieve new data from the source node.

- Select the maximum value for the field from the destination schema.  
- Retrieve all data from the source schema where the field is greater than the destination's maximum value.
- Store the new data in the destination schema.

## Codex Synchronization Tracts

Data synchronization tracts can be stored in the Codex.  Synchronization tracts can maintain state for the transfer.  The maximum field value transfered can be stored as part of the tract.

## Synchronizaton Tract

~~~json
{
  "sync_myschema": {
    "origin": {
      "smt": "model|locus|schema|*"
    },
    "terminal": {
      "smt": "model|locus|schema|*"
    },
    "state": {
      "field": "<field name>",
      "value": 0
    }
  }
}
~~~

## stroage-etl Example

~~~bash
>etl sync sync_myschema
~~~
