const file = fs.readFileSync('./async.wasm');
let wasm;
let promise;

const get = () =>  {
	promise = new Promise((resolve, reject) => {
		resolve(123);
	}).then(value => wasm.instance.exports.callback(value));
}

wasm = await WebAssembly.instantiate(file, {"env": {"get": get}});

export async function call() {
	wasm.instance.exports.call();
	return promise;
}
