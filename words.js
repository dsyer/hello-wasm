async function bytes(path) {
	if (typeof fetch !== "undefined") {
		return await fetch(path).then(response => response.arrayBuffer());
	}
	return await import('fs').then(fs => fs.readFileSync(path));
}

var exports = exports || {};

(async function () {

	const file = await bytes('words.wasm');
	const wasm = await WebAssembly.instantiate(file);

	const { memory, list } = wasm.instance.exports;

	exports.wasm = wasm;
	exports.memory = memory;
	exports.list = list;

})();