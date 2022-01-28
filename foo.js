async function readString(path) {
  if (typeof fetch !== "undefined") {
    return await fetch(path).then(response => response.text());
  }
  return await import('fs').then(() => fs.readFileSync(path, "utf8"))
}

if (typeof fetch === 'undefined') {
  let dirname = (await import("path")).dirname;
  globalThis.__dirname = dirname(import.meta.url);
  let createRequire = (await import('module')).createRequire;
  globalThis.require = createRequire(import.meta.url);
  globalThis.Module = { locateFile: function(path) { return './' + path; }};
}

var script = await readString('bar.js');
(1, eval)(script);

while (!Module.calledRun) {
  await new Promise(resolve => {
    setTimeout(resolve, 500);
  });
}

export default Module;