
let urn = "realm:name#name";
console.log(urn.length);

let i = urn.lastIndexOf("#");
console.log(i);

let urn2 = urn.substring(0, i);
console.log(urn2);

let u = urn.split("#");
console.log(u);

let x = "realm:name".split("#");
console.log(x);

let entry1 = {
  "realm": "realm",
  "name": "name"
};
let us1 = (entry1.realm ? entry1.realm : "") + ":" + entry1.name;
console.log(us1);

let entry2 = {
  "name": "name"
};
let us2 = (entry2.realm ? entry2.realm : "") + ":" + entry2.name;
console.log(us2);

let d;
let entry3 = {
  realm: d,
  "name": "name"
};
let us3 = (entry3.realm ? entry2.realm : "") + ":" + entry2.name;
console.log(us3);
