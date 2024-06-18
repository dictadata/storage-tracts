# @dictadata/storage-tracts 0.9.x

Command line utility to export, transfer and load (ETL) data from heterogeneous data sources. Implemented with Node.js streams. Converts data source formats to a normalized JSON representation with ability to transform the data.

Dependent upon the [@dictadata/storage-junctions](https://github.com/dictadata/storage-junctions) package.

## Prerequisites

Node.js version 18 or higher.  Download the latest stable installer from [https://nodejs.org/en/download/](https://nodejs.org/en/download/).

## Installation

```bash
    npm install -g @dictadata/storage-tracts
```

## Command Line Usage

```bash
  Command line:
    etl [-c configFile] [-t tractFile] fiber-name

  configFile
    JSON configuration file that defines engrams, plug-ins and logging.
    Supports abbreviated name; "-c dev" for "./etl.dev.config.json"
    Default configuration file is ./etl.config.json

  tractFile
    ETL tract filename or Tracts urn that defines tract to process.
    Default tract file is ./etl.tract.json

  fiber-name
    The fiber to process in the tract file. Required.  Use '*' to process all fibers.

  Actions:
    transfer - transfer data between data stores with optional transforms.
    copy - copy data files between remote file system and local file system.
    list - listing of schema names at origin, datastore or filesystem.
    codify - determine schema encoding by examining some data.
    dull - remove data from a data store.
    engrams - manage engrams encoding definitions
    tracts = manage ETL tract definitions
    scan - list schemas, e.g. files, at origin and perform sub-fibers for each schema.
    foreach - retrieve data and perform child action(s) for each construct.
    all | * - run all actions in sequence.
    parallel - run all actions in parallel.
```

## Config File

Default configuration settings can be specified in a config tract in **etl.config.json**.  The file will be read from the current working directory.  Example configuration tract:

```json
{
  "config": {
    "engrams": {
      "engrams": {
        "smt": "elasticsearch|http://localhost:9200/|etl_engrams|*"
      }
    },
    "log": {
      "logPath": "./log",
      "logPrefix": "etl",
      "logLevel": "info"
    },
    "plugins": {
      "filesystems": [],
      "junctions": [],
      "transforms": []
    }
  },
  "params": {
    "name1": "value1"
  }
}
```

## Tract File

- A tract file contains an array of fibers.
- An action specifies the origin and terminal SMT addresses along with options, encoding, transforms and output information.
- Origin and terminal MUST both be supported and compatible key stores or record stores.
- Scan functionality supports file storage such as local folders, FTP and AWS S3 buckets.
- Transforms are optional. If specified then fields will be transformed between origin and terminal.

### Variable Replacements

A fiber section can use "${name}" syntax for variable names.

Variable values are defined in a `params` section of Config and/or Tract files.

```json
{
  "config": {
  },
  "params": {
    "schema": "foofile",
    "input": "./test/_data/input",
    "output": "./test/_data/output"
  }
}
```

In a Tract file variables are declared using ${} syntax.

```json
{
  "transfer": {
    "origin": {
      "smt": "json|${input}|${schema}.json|*"
    },
    "terminal": {
      "smt": "json|${output}/fs/|var_${schema}.json|*"
    }
  }
}
```

## Examples

### Transfer and transform a .json file to "flat" .csv file

```bash
    etl transfer -c etl_flatten.json
```

etl_flatten.json:

```json
{
  "transfer_foofile": {
    "action": "transfer",
    "origin": {
      "smt": "json|./test/_data/input/|foofile.json|*"
    },
    "transforms": [
      {
        "transform": "select",
        "fields": {
          "Foo": "foo",
          "Bar": "bar",
          "Baz": "baz",
          "State.Enabled": "enabled"
        }
      }
    ],
    "terminal": {
      "smt": "csv|./test/_data/output/|fooflat.csv|*",
      "options": {
        "header": true
      }
    }
  }
}
```

foofile.json:

```json
[
  {
    "Foo": "first",
    "Bar": 123,
    "Baz": "2018-10-07",
    "State": {
      "Enabled": true
    }
  },
  {
    "Foo": "second",
    "Bar": 456,
    "Baz": "2018-10-07",
    "State": {
      "Enabled": false
    }
  },
  {
    "Foo": "third",
    "Bar": 789,
    "Baz": "2018-10-18",
    "State": {
      "Enabled": true
    }
  }
]
```

fooflat.csv

```json
  "foo","bar","baz","enabled"
  "first",123,"2018-10-07",true
  "second",456,"2018-10-07",false
  "third",789,"2018-10-18",true
```

### NOSA Weather Service transfer

```bash
etl transfer -c etl_weather.json forecast
```

etl_weather.json:

```json
{
  "fibers": [
    {
      "name": "forecast",
      "action": "transfer",
      "origin": {
        "smt": "rest|https://api.weather.gov/gridpoints/DVN/34,71/|forecast|=*",
        "options": {
          "http": {
            "headers": {
              "Accept": "application/ld+json",
              "User-Agent": "@dictadata.net/storage-node contact:info@dictadata.net"
            }
          },
          "pick": "periods"
        }
      },
      "terminal": {
        "smt": "csv|./test/_data/output/|etl-3-weather.csv|*",
        "options": {
          "header": true
        }
      }
    }
  ]
}
```
