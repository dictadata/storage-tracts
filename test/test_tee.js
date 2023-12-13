const fs = require('node:fs');
const stream = require('node:stream/promises');

(async () => {
  console.log('rs');
  const rs = fs.createReadStream('./test/data/output/shapefiles_list_raw.json');

  console.log('ws1');
  const ws1 = fs.createWriteStream('./test/data/output/shapefiles_1.json');

  rs.pipe(ws1);

  console.log('ws1');
  const ws2 = fs.createWriteStream('./test/data/output/shapefiles_2.json');

  rs.pipe(ws2);

  await stream.finished(rs);
  await stream.finished(ws1);
  await stream.finished(ws2);
})();
