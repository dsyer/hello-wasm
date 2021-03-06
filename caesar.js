async function bytes(path) {
	if (typeof fetch !== "undefined") {
		return await fetch(path).then(response => response.arrayBuffer());
	}
	return await import('fs').then(fs => fs.readFileSync(path));
}

(async () => {
	const wasm = await bytes('caesar.wasm').then(file => WebAssembly.instantiate(file));

	const { memory, caesarEncrypt, caesarDecrypt } = wasm.instance.exports;

	const plaintext = "helloworld";
	const myKey = 3;

	const encode = function stringToIntegerArray(string, array) {
		const alphabet = "abcdefghijklmnopqrstuvwxyz";
		for (let i = 0; i < string.length; i++) {
			array[i] = alphabet.indexOf(string[i]);
		}
	};

	const decode = function integerArrayToString(array) {
		const alphabet = "abcdefghijklmnopqrstuvwxyz";
		let string = "";
		for (let i = 0; i < array.length; i++) {
			string += alphabet[array[i]];
		}
		return string;
	};

	const myArray = new Int32Array(memory.buffer, 0, plaintext.length);

	encode(plaintext, myArray);

	console.log(myArray); // Int32Array(10) [7, 4, 11, 11, 14, 22, 14, 17, 11, 3]
	console.log(decode(myArray)); // helloworld

	caesarEncrypt(myArray.byteOffset, myArray.length, myKey);

	console.log(myArray); // Int32Array(10) [10, 7, 14, 14, 17, 25, 17, 20, 14, 6]
	console.log(decode(myArray)); // khoorzruog

	caesarDecrypt(myArray.byteOffset, myArray.length, myKey);
	console.log(myArray);         // Int32Array(10) [7, 4, 11, 11, 14, 22, 14, 17, 11, 3]
	console.log(decode(myArray)); // helloworld
})();                           // don't forget to close that async function!