# @dicta-io/storage-etl

Command line utilities to convert and/or transform data between JSON and CSV file formats.

# Prerequisites

Node.js version 10.15 or higher.  Download the installer from https://nodejs.org/en/download/

# Usage

    node storage-etl.js inputfile outputfile [transforms.json]

- The inputfile and outputfile can be either .json or .csv format.
- JSON files needs to be an array of objects e.g. [ {}, {}, ...]
- A transforms file is optional. If specified then fields will be transformed between input and output.

## transforms.json format

The transforms file is .json format. It uses dot notation to reference proerpties in the source and target records.

    { 
       "sourceField": "targetField", 
       "sourceProperty.field1": "targetField2", 
       "sourceProperty.field2": "targetProperty.field", 
       "source.sub.field": "targetField3", 
       ... 
    }
