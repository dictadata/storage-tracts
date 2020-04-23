# @dictadata/storage-etl 1.1.0

Command line ETL utilitiy to transfer and optionally transform data between distributed storage sources.

## Prerequisites

Node.js version 12.0 or higher.  Download the installer from https://nodejs.org/en/download/

## Installation

    npm install -g @dictadata/storage-etl

## Command Line Usage

```bash
  etl command [-c configfile] [source] [destination]

  Commands:
    codify - determine storage encoding for a single schema
    list - listing of schema names in data source
    scan - scan data source to determine storage encoding by codifying multiple schemas
    transfer - transfer data between two data sources, with optional transform
```

## Config File

- A config file specifies the source and destination SMT addresses along with encoding, transform and transfer information.
- Source and destination can be supported and compatible storage source.
- Scan function supports file storage like local folders, FTP and AWS S3 buckets.
- Transforms are optional. If specified then fields will be transformed between input and output.
- JSON files only support an array of objects e.g. [ {}, {}, ...].

## Transform

The transforms file is .json format. It uses dot notation to reference properties in the source and target records.

```
  {
      "sourceField": "targetField",
      "sourceProperty.field1": "targetField2",
      "sourceProperty.field2": "targetProperty.field",
      "source.sub.field": "targetField3",
      ...
  }
```

## Transfer config File Format

```
{
  "transfer-1": {
    "origin": {
      "smt": "json|./test/data/|foofile.json|*",
      "options": {}
    },
    "transforms": {
      "filter": {
        "match": {
          "Bar": "row"
        }
        },
        "drop": {
          "Baz": {
            "eq": 5678
          }
        }
      },
      "select": {
        "inject_before": {
          "Fie": "where's fum?"
        },
        "fields": {
          "Foo": "foo",
          "Bar": "bar",
          "Baz": "baz",
          "Fobe": "fobe",
          "Dt Test": "dt_test",
          "enabled": "enabled",
          "subObj1.state": "state",
          "subObj2.subsub.izze": "izze"
        }
      }
    },
    "terminal": {
      "smt": {
        "model": "csv",
        "locus": "./test/output/",
        "schema": "etl-1.csv",
        "key": "*"
      },
      "options": {},
      "encoding": "filename.json"
    }
  }
}
```


## Examples

### Convert a .csv file to .json

    storage-etl convert foofile.csv foofile_out.json

foofile.csv

    Foo, Bar, Baz, Enabled
    first, 123, 2018-10-07, true
    second, 456, 2018-10-07, false
    third, 789, 2018-10-18, true

Generates foofile_out.json

    [
      {"Foo":"first","Bar":"123","Baz":"2018-10-07","Enabled":"true"},
      {"Foo":"second","Bar":"456","Baz":"2018-10-07","Enabled":"false"},
      {"Foo":"third","Bar":"789","Baz":"2018-10-18","Enabled":"true"}
    ]

### Convert and transform a .json file to "flat" .csv

    storage-etl convert foofile.json foofile_out.csv transforms.json

foofile.json

    [
      {
        "Foo": "first",
        "Bar": "123",
        "Baz": "2018-10-07",
        "State": {
          "Enabled": "true"
        }
      },
      {
        "Foo": "second",
        "Bar": "456",
        "Baz": "2018-10-07",
        "State": {
          "Enabled": "false"
        }
      },
      {
        "Foo": "third",
        "Bar": "789",
        "Baz": "2018-10-18",
        "State": {
          "Enabled": "true"
        }
      }
    ]

transform.json

    {
      "Foo": "foo",
      "Bar": "bar",
      "Baz": "baz",
      "State.Enabled": "enabled"
    }

Generates foofile_out.csv

    foo,bar,baz
    first,123,2018-10-07
    second,456,2018-10-07
    third,789,2018-10-18

### NOSA Weather Service transfer

```
storage-etl transfer weather.json
```
weather.json:
```
{
  "forecast": {
    "origin": {
      "smt": "rest|https://api.weather.gov/gridpoints/DVN/34,71/|forecast|=*",
      "options": {
        "headers": {
          "Accept": "application/ld+json",
          "User-Agent": "@dictadata.org/storage-node contact:info@dictadata.org"
        },
        "extract": {
          "names": "",
          "data": "periods"
        }
      }
    },
    "transforms": {
      "select": {
        "inject": {
          "Fie": "It's always sunny in Philadelphia?"
        }
      }
    },
    "terminal": {
      "smt": "csv|./test/output/|etl-3-weather.csv|*",
      "options": {}
    }
  }
}
```
