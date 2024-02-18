## Storage ETL Command Line Interface

```bash
storage-tracts (etl) 0.9.x

  Command line:
    etl [-c configFile] [-t tract] action-name

  configFile
    JSON configuration file that defines engrams, plug-ins and logging.
    Supports abbreviated name; "-c dev" for "./etl.config.dev.json"
    Default configuration file is ./etl.config.json

  tract
    ETL tract filename or Tracts urn that defines tract to process.
    Default tract file is ./etl.tract.json

  actionName
    The action to perform in the tract file. Required.  Use '*' to process all actions.

  Actions:
    transfer - transfer data between data stores with optional transforms.
    copy - copy data files between remote file system and local file system.
    list - listing of schema names at origin, datastore or filesystem.
    codify - determine schema encoding by examining some data.
    dull - remove data from a data store.
    engrams - manage engrams encoding definitions
    tracts = manage ETL tract definitions
    scan - list schemas, e.g. files, at origin and perform sub-actions for each schema.
    iterate - retrieve data and perform child action(s) for each construct.
    all | * - run all actions in sequence.
    parallel - run all actions in parallel.
```
