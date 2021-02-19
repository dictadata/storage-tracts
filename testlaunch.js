const fs = require("fs");
const { spawn } = require('child_process');

let category = process.argv.length > 2 ? process.argv[2] : "";

(async () => {
  try {
    let l = fs.readFileSync("./.vscode/launch.json", "utf-8");
    let lj = l.replace(/\/\/.*/g, "");
    var launch = JSON.parse(lj);

    for (let config of launch.configurations) {
      if (!category || config.name.indexOf(category) === 0) {
        console.log(config.name);
        if (config.type === "pwa-node" && config.request === "launch" && config.program) {
          let script = config.program.replace("${workspaceFolder}", ".");
        
          let args = [script];
          if (config.args) {
            for (let arg of config.args) {
              arg = arg.replace("${workspaceFolder}", ".");
              args.push(arg);
            }
          }

          let exitcode = await runTest(args);
          if (exitcode !== 0)
            break;
        }
      }
    }
  }
  catch (err) {
    console.log(err.message);
    process.exitCode = 1;
  }
})();

async function runTest(args) {
  return new Promise((resolve, reject) => {
    const program = spawn('node', args);

    program.stdout.on('data', (data) => {
      if (data[data.length - 1] === 10 && data[data.length - 2] === 13)
        console.log(`${data.slice(0, data.length - 2)}`);
      else
        console.log(`${data}`);
    });

    program.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    program.on('close', (code) => {
      console.log(`child process close with code ${code}`);
      resolve(code);
    });

    program.on('disconnect', () => {
      console.log(`child process disconnect`);
      resolve(code);
    });

    program.on('error', (error) => {
      console.log(`child process error ${error.message}`);
      resolve(code);
    });
/*
    program.on('exit', (code) => {
      console.log(`child process exit with code ${code}`);
      resolve(code);
    });
*/
  });
}
