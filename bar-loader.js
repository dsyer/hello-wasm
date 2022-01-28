async function readString(path) {
  if (typeof fetch !== "undefined") {
    const response = await fetch(path);
    const file = await response.text();
    return file;
  }
  const fs = await import('fs');
  return fs.readFileSync(path, "utf8")
}

console.log(new URL(import.meta.url).pathname)

let preinit = "";
if (typeof fetch === 'undefined') {
  let dirname = (await import("path")).dirname;
  globalThis.__dirname = dirname(import.meta.url);
  let createRequire = (await import('module')).createRequire;
  globalThis.require = createRequire(import.meta.url);
  preinit = "var Module = { locateFile: function(path) { return './' + path; }};\n";
}

var script = await readString(new URL(import.meta.url).pathname.replace("-loader", ""));
(1, eval)(preinit + script);

async function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
let init = async function () {
  while (!Module.calledRun) {
    await wait(500);
  }
}
await init();

export default Module;
