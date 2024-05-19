const { findFile } = require("../../storage/utils");

(async () => {
  console.log(await findFile("./etl.dev.config.json"));
  console.log(await findFile("./etl.dev.config.json"));
  console.log(await findFile("nonexistent.file") || "fileFile: not found");
})()
