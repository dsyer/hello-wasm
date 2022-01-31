async function bytes(path) {
	if (typeof fetch !== "undefined") {
		return await fetch(path).then(response => response.arrayBuffer());
	}
	return await import('fs').then(fs => fs.readFileSync(path));
}

const MAX_LENGTH = 256;
let strlen = function(buffer,index) {
	var i=0; 
	var page = new Uint8Array(buffer, index, Math.min(buffer.byteLength - index,  MAX_LENGTH));
	while(i<page.length && page[i]!=0) i++
	return i;
};

(async () => {
	const file = await bytes('reverse.wasm');
	const wasm = await WebAssembly.instantiate(file);

	const { memory, reverse, greet } = wasm.instance.exports;

	const plaintext = "helloworld";
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	var buffer = new Uint8Array(memory.buffer, 0, plaintext.length + 1);
	buffer.set(encoder.encode(plaintext), 0);
	
	reverse(buffer, buffer.length);
	console.log(buffer);
	console.log(decoder.decode(buffer));
	buffer.set(Array(buffer.length).fill(0));

	const name = "World";
	buffer = new Uint8Array(memory.buffer, 0, name.length + 1);
	buffer.set(encoder.encode(name), 0);
	var ptr = greet(buffer);
	const result = new Uint8Array(memory.buffer, ptr, strlen(memory.buffer, ptr));
	console.log(result);
	console.log(decoder.decode(result));
	buffer.set(Array(buffer.length).fill(0));

})();