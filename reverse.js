async function bytes(path) {
	if (typeof fetch !== "undefined") {
		return await fetch(path).then(response => response.arrayBuffer());
	}
	return await import('fs').then(fs => fs.readFileSync(path));
}

const MAX_LENGTH = 256;
let strlen = function (buffer, index) {
	var i = 0;
	var page = new Uint8Array(buffer, index, Math.min(buffer.byteLength - index, MAX_LENGTH));
	while (i < page.length && page[i] != 0) i++
	return i;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

var exports = exports || {};

(async function () {

	const file = await bytes('reverse.wasm');
	const wasm = await WebAssembly.instantiate(file);

	const { memory, reverse, greet, find, list } = wasm.instance.exports;

	const plaintext = "helloworld";
	var buffer = new Uint8Array(memory.buffer, 0, plaintext.length);
	buffer.set(encoder.encode(plaintext), 0);

	reverse(buffer, buffer.length);
	console.log(buffer);
	console.log(decoder.decode(buffer));
	buffer.set(Array(buffer.length).fill(0));

	const name = "World";
	buffer = new Uint8Array(memory.buffer, 0, name.length + 1);
	buffer.set(encoder.encode(name), 0);
	var ptr = greet(buffer);
	buffer.set(Array(name.length).fill(0));
	const result = new Uint8Array(memory.buffer, ptr, strlen(memory.buffer, ptr));
	console.log(result);
	console.log(decoder.decode(result));
	result.set(Array(result.length).fill(0));

	exports.wasm = wasm;
	exports.memory = memory;
	exports.reverse = function (plaintext) {
		var buffer = new Uint8Array(memory.buffer, 0, plaintext.length);
		buffer.set(encoder.encode(plaintext), 0);
		reverse(buffer, buffer.length);
		var result = decoder.decode(buffer);
		buffer.set(Array(buffer.length).fill(0)); // null out the input
		return result;
	};
	exports.greet = function (name) {
		const buffer = new Uint8Array(memory.buffer, 0, name.length + 1);
		buffer.set(encoder.encode(name), 0);
		const ptr = greet(buffer);
		buffer.set(Array(name.length).fill(0)); // null out the input
		const result = new Uint8Array(memory.buffer, ptr, strlen(memory.buffer, ptr));
		const value = decoder.decode(result);
		result.set(Array(result.length).fill(0)); // null out the output
		return value;
	};
	exports.find = find;
	exports.list = list;
	exports.strlen = strlen;

})();