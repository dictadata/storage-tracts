#!/usr/bin/env node
/**
 * convert_tracts
 *
 * Convert abc.tract.json files from pre 0.9.74 format to post 0.9.74 format.
 */
"use strict";

const fs = require('fs');
const path = require('path');

(async () => {
  let retCode = 0;

  let tractFile = process.argv[ 2 ];
  console.log(tractFile);

  let tractText = fs.readFileSync(tractFile, 'utf-8');
  let tract = JSON.parse(tractText);

  if (tract.tracts || tract.actions) {
    console.log("already reformatted")
    return retCode;
  }

  let p = path.parse(tractFile);

  let newTract = {
    "realm": "",
    "name": p.name,
    "type": "tract",
    "actions": []
  }

  for (let [ name, action ] of Object.entries(tract)) {
    if (name === 'config')
      newTract[ name ] = action;
    else
      newTract.actions.push(Object.assign({ name: name }, action));
  }

  /*
  delete p.base;
  p.name = p.name + "(1)";
  let fn = path.format(p);
  console.log(fn);
*/

  fs.writeFileSync(tractFile, JSON.stringify(newTract, null, 2), { encoding: 'utf-8', flag: 'w' });

  return retCode;
})();
