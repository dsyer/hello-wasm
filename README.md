== Hello World

Following tutorial at [wasmbyexample.dev](https://wasmbyexample.dev/examples/hello-world/hello-world.c.en-us.html). Hello world using emscripten to generate HTML, Javascript and WASM (http://localhost:8000/hello.html and look at console):

```
$ emcc hello.c -O3 -o hello.html
$ node hello.js
hello, world!
$ python -m http.server 8000
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

Also from that tutorial, there's a Caesar cypher using emscripten to generate just WASM:

```
$ emcc -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_caesarEncrypt', '_caesarDecrypt']" -Wl,--no-entry "caesar.cpp" -o "caesar.wasm"
```

== String Transformation

Reverse a string using emscripten to generate just WASM (http://localhost:8000/reverse.html and look at console):

```c
void reverse(char *plaintext, int length)
{
	for (int i = 0; i < length / 2; i++)
	{
		char value = plaintext[i];
		plaintext[i] = plaintext[length - i - 1];
		plaintext[length - i - 1] = value;
	}
}
```

Compile:

```
$ emcc -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_reverse']" -Wl,--no-entry "reverse.c" -o "reverse.wasm"
```

import into Javascript:

```javascript
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
```

and run:

```
$ nodeWelcome to Node.js v16.13.2.
Type ".help" for more information.
> var reverse = require('./reverse.js')
undefined
> Uint8Array(11) [
    0, 100, 108, 114,
  111, 119, 111, 108,
  108, 101, 104
]
dlrowolleh
```

== Pointers

If you know how the memory is laid out in C you can pass data back from the WASM to Javascript through the WASM memory. Strings should be easy, so let's try this in `reverse.c`:

```c
char *greet(char *plaintext, int length)
{
	char *result = malloc(sizeof(char)*(length + 6));
	result = "Hello ";
	strcat(result, plaintext);
	return result;
}
```

```
$ emcc -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_reverse','_greet']" -Wl,--no-entry "reverse.c" -o "reverse.wasm"
```

Then we can play with it in Javascript. The value that is returned from `greet` will be an index into the `memory` array.

```javascript
const wasm = await import('fs').then(fs => fs.readFileSync('reverse.wasm')).then(file => WebAssembly.instantiate(file))
const { memory, reverse, greet } = wasm.instance.exports;

const name = "World";
const value = new Uint8Array(memory.buffer, 0, name.length + 1);
value.set(encoder.encode(name), 0);
const result = new Uint8Array(memory.buffer, greet(value), name.length + 6);
console.log(result);
console.log(decoder.decode(result));
```

We needed to know magically that the result was 6 characters longer than the input. Or we could have worked it out by finding the null terminator.

```
const MAX_LENGTH = 256;
let strlen = function(buffer,index) {
	var i=0; 
	var page = new Uint8Array(buffer, index, Math.min(buffer.byteLength - index,  MAX_LENGTH));
	while(i<page.length && page[i]!=0) i++
	return i;
};
var ptr = greet(value);
const result = new Uint8Array(memory.buffer, ptr, strlen(memory.buffer, ptr));
console.log(result);
console.log(decoder.decode(result));
```

If we put that code straight into `reverse.js` we might get a nasty surprise - the `reverse()` function and the `greet()` function can and will write on each other's buffer. So we need to null out the buffers after we finish with them:

```javascript
buffer.set(Array(buffer.length).fill(0));
```

== Random Numbers

Random numbers using emscripten to generate Javascript and WASM (http://localhost:8000/randoms.html and look at console):

```
$ emcc -Os -s EXPORTED_FUNCTIONS="['_printit','_main']" -s EXPORT_ES6=1 randoms.c -o randoms.js
```

Also works in Node. The generated Javascript is kind of [buggy](https://github.com/emscripten-core/emscripten/issues/11792) so you have to set up some globals:

```
$ node
Welcome to Node.js v16.13.1.
Type ".help" for more information.
> await import('path').then(path => globalThis.__dirname = path.dirname('./randoms.js'));
> await import('module').then(module => globalThis.require = module.createRequire(new URL("file://" + process.cwd())));
> var randoms = await import('./randoms.js').then(module => module.default({ locateFile: function (path) { return './' + path; } }));
```

It's a bit simpler if you can just use CommonJS (compile without the ES6 flag):

```
$ emcc -Os -s EXPORTED_FUNCTIONS="['_printit','_main']" randoms.c -o randoms.cjs
```

and

```
$ node
Welcome to Node.js v16.13.1.
Type ".help" for more information.
> var randoms = require('./randoms.cjs')
undefined
> Starting...

> randoms._printit()
0.830624
0.165981
0.218746
0.534809
0.715307
```

(You can also use `random.js` as the filename but then you have to `rm package.json` first to switch off ES6 in the REPL.)

Boilerplate for importing ES6 modules is illustrated in `foo.js`, which imports `bar.js` (generated by emscripten). The same thing but without hard coding the target script name is in `bar-loader.js`.

== Wordle

See http://localhost:8000 for demo:

```
$ emcc -Os -s EXPORTED_FUNCTIONS="['_guess','_solution','_main', '_validate', '_reset']" wordle.c -o wordle.js
```

Some lessons learned:

* The `-s STANDALONE_WASM` flag screws up the `time()` function - the return value and hence the random seed is always 0, so the game works but it's always the same word.
* Byte arrays from `TextEncoder.encode()` are not null terminated, but some functions in C depend on that, so you have to pass in a buffer with the extra null. The WASM memory is initialized with nulls, so those functions work as long as you don't write into the memory above the string.
* You have to zero out the arrays that you pass to the WASM after using them, unless you don't care about leaking between calls, and possibly getting wrong results (null terminated strings).
* A buffer of length 1 is always an empty string, even if the first element is non-null in Javascript. That's why we always create buffers with size `value.length + 1` to pass a string `value` down into the WASM.

== Protobufs

Given this simple protobuf:

```
syntax = "proto3";
message Person {
	string id = 1;
	string name = 2;
}
```

We can generate Javascript bindings:

```
$ protoc --js_out=import_style=commonjs:. person.proto 
```

which leads to:

```
$ npm install --save google-protobuf
$ node
Welcome to Node.js v16.13.1.
Type ".help" for more information.
> var pkg = require('./person_pb')
> var m = new pkg.Person(['12345', 'Josh'])
undefined
> m.toObject()
{ id: '12345', name: 'Josh' }
> m.serializeBinary()
Uint8Array(13) [
   10,  5, 49, 50,  51,  52,
   53, 18,  4, 74, 111, 115,
  104
]
```

Then we can generate some C code:

```
$ protoc-c --c_out=. person.proto
```

which gives us `person.pb-c.c` and `person.pb-c.h`.

Then let's create a simple `person.c`:

```c
#include <stdio.h>
#include <stdlib.h>
#include "person.pb-c.h"

int main() {
	Person *person = malloc(sizeof(Person));
	person->id = "54321";
	person->name = "Juergen";
	printf("%s %s\n", person->id, person->name);
	return 0;
}
```

We can compile it with `gcc` and run it:

```
$ gcc person.pb-c.c person.c -lprotobuf-c  -o person
$ ./person
54321 Juergen
```

Building `protobuf` (https://github.com/protocolbuffers/protobuf). Check the `PROTOBUF_VERSION`:

```
$ grep PROTOBUF_VERSION /usr/include/google/protobuf/stubs/common.h 
#define GOOGLE_PROTOBUF_VERSION 3012004
```

That means `3.12.4` is installed in the Ubuntu system, so we'll grab that and compile it:

```
$ git checkout v3.12.4
$ ./autogen.sh
$ emconfigure ./configure --host=none-none-none
$ emmake make
$ find . -name \*.a
./src/.libs/libprotobuf-lite.a
./src/.libs/libprotobuf.a
./src/.libs/libprotoc.a
```

Loads of warnings about `LLVM version appears incorrect (seeing "12.0", expected "11.0")` but it seems to work.

Building `protobuf-c` is trickier because it has to point back to the `protobuf` build, and also has to be a compatible version (hence the `3.12.4` tag in `protobuf`):

```
$ EMMAKEN_CFLAGS=-I../protobuf/src EM_PKG_CONFIG_PATH=../protobuf emconfigure ./configure --host=none-none-none --enable-wasm --verbose
$ EMMAKEN_CFLAGS='-I../protobuf/src -L../protobuf/src/.libs' emmake make
$ find . -name \*.a
./protobuf-c/.libs/libprotobuf-c.a
```

The Ubuntu system `emscripten` fails to compile the `person.c` ("Error: Cannot find module 'acorn'"), but if you get the latest `emcc` from `emsdk` it works ():

```
$ emcc -Os -I tmp/protobuf-c -L tmp/protobuf-c/.libs:tmp/protobuf/src/.libs -s EXPORTED_FUNCTIONS="['_main']"  person.c -o person.js
```

N.B. it *doesn't* work with the Node.js version that ships with `emsdk`, so you have to compile and run in different terminals. So the vanilla `person.js` is a CommonJS script (hence you have to remove the `type=module` from `package.json`):

```
$ node
Welcome to Node.js v16.13.2.
Type ".help" for more information.
> var person = require('./person.js')
undefined
> 54321 Juergen
```

or compile with `-s EXPORT_ES6` and use a loader shim:

```
$ nodeWelcome to Node.js v16.13.2.
Type ".help" for more information.
> var person = await import('./person-loader.js')
54321 Juergen
undefined
```

