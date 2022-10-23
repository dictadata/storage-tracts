
let str = "2020_TL_Shapefiles_File_Name_Definitions.pdf";

let rx = new RegExp("^.*\.pdf$");
console.log(rx.test(str));

rx = new RegExp("Shape");
console.log(rx.test(str));
