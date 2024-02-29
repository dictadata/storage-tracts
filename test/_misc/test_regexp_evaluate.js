let exp = [ "State Senate District 01", "State Senate District (..)", "0$1" ]
let value = exp[ 0 ];
let rx = new RegExp(exp[ 1 ]);
let rep = exp[ 2 ];
let v2 = value.replace(rx, "0$1");

console.log(value + "  " + v2);
