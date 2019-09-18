# @dicta-io/storage-etl

Command line ETL utilitiy to copy, convert and transform data between distributed storage sources.
Currently, supports JSON and CSV file formats.

# Prerequisites

Node.js version 10.0 or higher.  Download the installer from https://nodejs.org/en/download/

# Installation

    npm install -g @dicta-io/storage-etl

# Usage

    storage-etl inputfile outputfile [transforms.json]

- The inputfile and outputfile can be either .json or .csv format.
- JSON files needs to be an array of objects e.g. [ {}, {}, ...]
- A transforms file is optional. If specified then fields will be transformed between input and output.

## transforms.json format

The transforms file is .json format. It uses dot notation to reference properties in the source and target records.

    { 
       "sourceField": "targetField", 
       "sourceProperty.field1": "targetField2", 
       "sourceProperty.field2": "targetProperty.field", 
       "source.sub.field": "targetField3", 
       ... 
    }

# Examples

## Convert a .csv file to .json

    storage-etl input.csv output.json

## Convert and transform a .json file to "flat" .csv 

    storage-etl input.json output.csv transforms.json
