# @dictadata/storage-etl 0.9.x

Command line ETL utilitiy to transfer, transform and codify data between local and distributed storage sources.

## Prerequisites

Node.js version 16 or higher.  Download the latest stable installer from [https://nodejs.org/en/download/](https://nodejs.org/en/download/).

## Installation

```bash
    npm install -g @dictadata/storage-etl
```

## Command Line Usage

```bash
  Command line:
    etl [-c configFile] [-t tractsFile] tractName
  or:
    storage-etl [-c configFile] [-t tractsFile] tractName

  configFile
    JSON configuration file that defines codex, plug-ins and logging.
    Supports abbreviated name; "-c dev" for "./etl.config.dev.json"
    Default configuration file is ./etl.config.json

  tractsFile
    JSON file that defines ETL tracts.
    Default configuration file is ./etl.tracts.json

  tractName
    The tract to follow in the tracts file. Required.  Use '*' to process all tracts.
    Shortcut syntax, if "action" is not defined in the tract then action defaults to the tractName, e.g. "transfer".

  Actions:
    transfer - transfer data between data stores with optional transforms.
    copy - copy data files between remote file system and local file system.
    list - listing of schema names at origin, datastore or filesystem.
    codify - determine schema encoding by examining some data.
    dull - remove data from a data store.
    codex - manage codex encoding definitions
    scan - list schemas, e.g. files, at origin and perform sub-actions for each schema.
    iterate - retrieve data and perform child action(s) for each construct.
    all | * - run all tracts in sequence.
    parallel - run all tracts in parallel.
    config - create example etl.tracts.json file in the current directory.
```

## Configuration File

Default configuration settings can be specified in a _config tract in **etl.config.json**.  The file will be read from the current working directory.  Example configuration tract:

```json
{
  "_config": {
    "codex": {
      "smt": "elasticsearch|http://dev.dictadata.net:9200/|dicta_codex|*"
    },
    "log": {
      "logPath": "./log",
      "logPrefix": "etl",
      "logLevel": "info"
    },
    "plugins": {
      "filesystems": [],
      "junctions": []
    },
    "variables": {
      "name1": "value1"
    }
  }
}
```

## Tracts File

- A tracts specifies the origin and terminal SMT addresses along with options, encoding, transforms and output information.
- Origin and terminal MUST both be supported and compatible key stores or record stores.
- Scan functionality supports file storage such as local folders, FTP and AWS S3 buckets.
- Transforms are optional. If specified then fields will be transformed between origin and terminal.

## Examples

### Transfer and transform a .json file to "flat" .csv file

```bash
    storage-etl transfer -c etl_flatten.json
```

etl_flatten.json:

```json
{
  "transfer_foofile": {
    "action": "transfer",
    "origin": {
      "smt": "json|./data/input/|foofile.json|*"
    },
    "transform": {
      "select": {
        "fields": {
          "Foo": "foo",
          "Bar": "bar",
          "Baz": "baz",
          "State.Enabled": "enabled"
        }
      }
    },
    "terminal": {
      "smt": "csv|./data/output/|fooflat.csv|*",
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
storage-etl transfer -c etl_weather.json forecast
```

etl_weather.json:

Note, in the tract below the action is implied in the tract name "transfer_forecast".  This tract will be passed to the transfer action.

```json
{
  "transfer_forecast": {
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
      "smt": "csv|./data/output/|etl-3-weather.csv|*",
      "options": {
        "header": true
      }
    }
  }
}
```

### Variable Replacements

The variables must be defined in a config file. The _config.variables section of a tracts file will be ignored.

In the tracts file use the "${name}" syntax for variable names.

Config file:

```json
{
  "_config": {
    "variables": {
      "schema": "foofile",
      "input": "./data/input",
      "output": "./data/output"
    }
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
