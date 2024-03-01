# @dictadata/storage-tracts 0.9.x

Command line ETL utilitiy to transfer, transform and codify data between local and distributed storage sources.

## Prerequisites

Node.js version 16 or higher.  Download the latest stable installer from [https://nodejs.org/en/download/](https://nodejs.org/en/download/).

## Installation

```bash
    npm install -g @dictadata/storage-tracts
```

## Command Line Usage

```bash
  Command line:
    etl [-c configFile] [-t tract] action-name

  configFile
    JSON configuration file that defines engrams, plug-ins and logging.
    Supports abbreviated name; "-c dev" for "./etl.dev.config.json"
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

## Configuration File

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
      "junctions": []
    }
  },
  "params": {
    "name1": "value1"
  }
}
```

## Tract File

- A tract file contains an array of actions.
- An action specifies the origin and terminal SMT addresses along with options, encoding, transforms and output information.
- Origin and terminal MUST both be supported and compatible key stores or record stores.
- Scan functionality supports file storage such as local folders, FTP and AWS S3 buckets.
- Transforms are optional. If specified then fields will be transformed between origin and terminal.

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
      "smt": "json|./test/data/input/|foofile.json|*"
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
      "smt": "csv|./test/data/output/|fooflat.csv|*",
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
  "actions": [
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
          "extract": "periods"
        }
      },
      "terminal": {
        "smt": "csv|./test/data/output/|etl-3-weather.csv|*",
        "options": {
          "header": true
        }
      }
    }
  ]
}
```

### Variable Replacements

In an action use the "${name}" syntax for variable names.

Config file:

```json
{
  "config": {
  },
  "params": {
    "schema": "foofile",
    "input": "./test/data/input",
    "output": "./test/data/output"
  }
}
```

Tracts file:

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
