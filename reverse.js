async function bytes(path) {
	if (typeof fetch !== "undefined") {
		const response = await fetch(path);
		const file = await response.arrayBuffer();
		return file;
	}
	const fs = require('fs');
	return fs.readFileSync(path)
}

(async () => {
	const file = await bytes('reverse.wasm');
	const wasm = await WebAssembly.instantiate(file);

	const { memory, reverse } = wasm.instance.exports;

	const plaintext = "helloworld";
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const buffer = new Uint8Array(memory.buffer, 0, plaintext.length);
	buffer.set(encoder.encode(plaintext), 0);

	reverse(buffer.byteOffset, buffer.length);
	console.log(buffer);
	console.log(decoder.decode(buffer));
})();