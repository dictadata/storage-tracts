# Storage.auth. Credentials

The _Storage.Storage.auth._ is a map type cache of credentials. It is used by the Engrams, junctions and filesystems to look up credentials if they were not provided by the application.

Using the credentials Storage.auth. is useful if the Engrams entries are going to be displayed to end users and data source credentials are considered a security risk.

Credential values don't have to be stored in Storage.auth.. Depending upon the data source, applications can also include them in the _smt.locus_ field or an _options.auth_ object.

## Storage.auth. Entries

### Key Values

The key for the storing and recalling credentials is obtained from the smt.locus field. If the smt.locus is a URL like http:// or ftp:// then the key is url.origin, for example _<http://www.census.gov>_. If the smt.locus is not a URL then the smt.locus field is used as is, for example a database connection string; _server=dev.dictadata.net;database=storage_node_.

### Entry Properties

Common supported properties are:

```javascript
"host=dbserv;database=my_db": {
  auth: {
    username: "my_name",
    password: "my_password"
  }
}
```

or

```javascript
"https://www.server.com:1234": {
  auth: {
    apiKey: "abc123dorami"
  }
}
```

## Loading a Credentials file

A Storage.auth. credentials can be loaded using _Storage.Storage.auth..load()_ method.

```javascript
var Storage = require('@dictadata/storage-junctions');

Storage.Storage.auth..load("./auth_stash.json");
```

## Example Storage.auth. File

```json
{
  "http://dev.dictadata.net:9200": {
    "desciption": "elasticsearch",
    "auth" : {
      "apiKey": "abc123dorami"
    }
  },
  "ftp://dev.dictadata.net": {
    "description": "ftp server",
    "auth": {
      "username": "dicta",
      "password": "data"
    }
  },
  "server=dev.dictadata.net;database=storage_node": {
    "description": "MS SQL database",
    "auth": {
      "username": "dicta",
      "password": "data"
    }
  }
}
```
