async function readString(path) {
  if (typeof fetch !== "undefined") {
    const response = await fetch(path);
    const file = await response.text();
    return file;
  }
  const fs = await import('fs');
  return fs.readFileSync(path, "utf8")
}

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

while (!Module.calledRun) {
  await new Promise(resolve => {
    setTimeout(resolve, 500);
  });
}

export default Module;
