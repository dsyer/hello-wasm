if (typeof fetch === 'undefined') {
  await import('path').then(path => globalThis.__dirname = path.dirname(import.meta.url));
  await import('module').then(module => globalThis.require = module.createRequire(import.meta.url));
}

var wasm = (await import(new URL(import.meta.url).pathname.replace("-loader", ""))
  .then(value => value.default({ locateFile: function (path) { return './' + path; } })));

export default wasm;