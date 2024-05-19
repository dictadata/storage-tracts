## Storage ETL Command Line Interface

```bash
storage-tracts (etl) 0.9.x

  Command line:
    etl [-c configFile] [-t tract] fiber-name

  configFile
    JSON configuration file that defines engrams, plug-ins and logging.
    Supports abbreviated name; "-c dev" for "./etl.dev.config.json"
    Default configuration file is ./etl.config.json

  tract
    ETL tract filename or Tracts urn that defines tract to process.
    Default tract file is ./etl.tract.json

  fiber-name
    The action to perform in the tract file. Required.  Use '*' to process all fibers.

  Actions:
    transfer - transfer data between data stores with optional transforms.
    retrieve - retrieve data with fallback to a source origin.
    foreach - retrieve data and perform child fibers for each construct.
    tee - transfer data between origin and multiple destinations.
    dull - remove data from a data store.

    list - listing of schema names at origin, datastore or filesystem.
    scan - list schemas, e.g. files, at origin and perform sub-fibers for each schema.
    copy - copy data files between remote file system and local file system.

    schema - manage a schema instance.
    codify - determine schema encoding by examining some data.

    engrams - manage engrams encoding definitions
    tracts = manage ETL tract definitions

    all | * - run all fibers in sequence.
    parallel - run all fibers in parallel.
```
