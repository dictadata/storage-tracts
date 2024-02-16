
let str = "2020_TL_Shapefiles_File_Name_Definitions.pdf";

let rx = new RegExp("^.*\.pdf$");
console.log(rx.test(str));

rx = new RegExp("Shape");
console.log(rx.test(str));

let pname = 'name';
let pval = 'Drew';
let value = 'This is my name: ${name}!';
var regex = new RegExp("\\${" + pname + "}", "g");
let nval = value.replace(regex, pval);
console.log(value);
console.log(nval);
