## Storage ETL Command Line Interface

```bash
storage-etl (etl) 2.5.x
Transfer, transform and codify data between local and distributed storage sources.

etl [-c configFile] [-t tractsFile] [tractName] [schemaName]

configFile
  JSON configuration file that defines codex, plug-ins and logging.
  Default configuration file is ./storage-etl.config.json

tractsFile
  JSON file that defines tracts, plug-ins and logging.
  Default configuration file is ./etl.tracts.json

tractName
  The tract to follow in the configuration file.
  If 'action' is not defined in the tract then action defaults to the tractName.

schemaName
  A string value that will replace the string '${schema}' in the tract.
  The value will replace all occurrences of ${schema} using regex.

Actions:
  config - create example etl.tracts.json file in the current directory.
  list - listing of schema names in a data store.
  codify - determine schema encoding by codifying a single schema.
  scan - list data store and determine schema encoding by codifying multiple schemas.
  transfer - transfer data between data stores with optional transforms.
  dull - remove data from a data store.
  copy - copy data files between remote file system and local file system.
  all - run all tracts in sequence.
  parallel - run all tracts in parallel.
```
