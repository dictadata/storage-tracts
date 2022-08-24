# @dictadata/storage-etl 2.3.x

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
    etl [-t tractsFile] [tractName] [schemaName]
  or:
    storage-etl [-t tractsFile] [tractName] [schemaName]

  tractsFile
    JSON file that defines tracts, plug-ins and logging.
    Default tracts file is ./etl_tracts.json
  
  tractName
    The tract to follow in the tracts file.
    If "action" is not defined in the tract then action defaults to the tractName.

  schemaName
    A string value that will replace the string '${schema}' in the tract.
    The value will replace all occurences of ${schema} using regex.

  Actions:
    config - create example etl_tracts.json file in the current directory.
    codex - manage codex encoding definitions
    list - listing of schema names in a data store.
    codify - determine schema encoding by codifying a single data store schema.
    scan - list data store and determine schema encoding by codifying multiple schemas.
    dull - remove data from a data store.
    transfer - transfer data between data stores with optional transforms.
    copy - copy data files between remote file system and local file system.
    all - run all tracts in sequence.
    parallel - run all tracts in parallel.
```

## Configuration File

Default configuration settings can be specified in a _config tract in **storage-etl.config.json**.  The file will be read from the current working directory.  Example configuration tract:

```json
{
  "_config": {
    "codex": {
      "smt": "elasticsearch|http://localhost:9200/|dicta_codex|!name"
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
            "User-Agent": "@dictadata.org/storage-node contact:info@dictadata.org"
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
