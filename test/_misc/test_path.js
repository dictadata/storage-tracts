const path = require('path');

let p = "./test_tee.js";

//let fp = path.normalize(p);
let fp = path.resolve(p);

console.log(fp);
