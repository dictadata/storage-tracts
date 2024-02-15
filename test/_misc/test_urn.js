
let urn = "domain:name#name";
console.log(urn.length);

let i = urn.lastIndexOf("#");
console.log(i);

let urn2 = urn.substring(0, i);
console.log(urn2);

let u = urn.split("#");
console.log(u);

let x = "domain:name".split("#");
console.log(x);

let entry1 = {
  "domain": "domain",
  "name": "name"
};
let us1 = (entry1.domain ? entry1.domain : "") + ":" + entry1.name;
console.log(us1);

let entry2 = {
  "name": "name"
};
let us2 = (entry2.domain ? entry2.domain : "") + ":" + entry2.name;
console.log(us2);

let d;
let entry3 = {
  domain: d,
  "name": "name"
};
let us3 = (entry3.domain ? entry2.domain : "") + ":" + entry2.name;
console.log(us3);
