async function bytes(path) {
	if (typeof fetch !== "undefined") {
		return await fetch(path).then(response => response.arrayBuffer());
	}
	return await import('fs').then(fs => fs.readFileSync(path));
}


(async () => {
	const file = await bytes('reverse.wasm');
	const wasm = await WebAssembly.instantiate(file);

	const { memory, reverse } = wasm.instance.exports;

	const plaintext = "helloworld";
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const buffer = new Uint8Array(memory.buffer, 0, plaintext.length + 1);
	buffer.set(encoder.encode(plaintext), 0);

	reverse(buffer, buffer.length);
	console.log(buffer);
	console.log(decoder.decode(buffer));
})();