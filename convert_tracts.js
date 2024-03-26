#!/usr/bin/env node
/**
 * convert_tracts
 *
 * Convert abc.tract.json files from pre 0.9.74 format to post 0.9.74 format.
 */
"use strict";

const { readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

(async () => {
  let retCode = 0;

  let tractFile = process.argv[ 2 ];
  console.log(tractFile);

  let tractText = await readFile(tractFile, 'utf-8');
  let tract = JSON.parse(tractText);

  if (tract.fibers) {
    console.log("already reformatted")
    return retCode;
  }

  let p = path.parse(tractFile);

  let newTract = {
    "realm": "",
    "name": p.name,
    "type": "tract",
    "fibers": []
  }

  for (let [ name, fiber ] of Object.entries(tract)) {
    if (name === 'config')
      newTract[ name ] = fiber;
    else
      newTract.fibers.push(Object.assign({ name: name }, fiber));
  }

  /*
  delete p.base;
  p.name = p.name + "(1)";
  let fn = path.format(p);
  console.log(fn);
*/

  await writeFile(tractFile, JSON.stringify(newTract, null, 2), { encoding: 'utf-8', flag: 'w' });

  return retCode;
})();
