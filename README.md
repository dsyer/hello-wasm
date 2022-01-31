== Hello World

Following tutorial at [wasmbyexample.dev](https://wasmbyexample.dev/examples/hello-world/hello-world.c.en-us.html). Hello world using emscripten to generate HTML, Javascript and WASM (http://localhost:8000/hello.html and look at console):

```
$ emcc hello.c -O3 -o hello.html
$ node hello.js
hello, world!
$ python -m http.server 8000
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

=== Deconstructing the WASM

If we look at the WASM binary in a browser it converts is to WATM, a text representation:

```wasm
(module
  (func $a.a (;0;) (import "a" "a") (param i32 i32 i32 i32) (result i32))
  (func $a.b (;1;) (import "a" "b") (param i32 i32 i32) (result i32))
  (table $f (;0;) (export "f") 4 4 funcref)
  (memory $c (;0;) (export "c") 256 256)
  (global $global0 (mut i32) (i32.const 5245136))
...
  (data (i32.const 1024) "hello, world!\00\00\00\18\04")
  (data (i32.const 1048) "\05")
  (data (i32.const 1060) "\01")
  (data (i32.const 1084) "\02\00\00\00\03\00\00\00\c8\04\00\00\00\04")
  (data (i32.const 1108) "\01")
  (data (i32.const 1123) "\0a\ff\ff\ff\ff")
)
```

The "imports" at the top are 2 functions that need to be injected into the WASM so it can do its thing. One of them is `fd_write` and the other is `proc_exit` - those are the 2 system calls that `hello.c` makes in its `main()` function. They are obfuscated as "a" and "b" because that's what the JavaScript driver `hello.js` injects. If you scan through `hello.js` you will see, for instance, that it defines

```javascript
var asmLibraryArg={"b":_emscripten_memcpy_big,"a":_fd_write};
```

and

```javascript
function _fd_write(fd,iov,iovcnt,pnum){ ... }
```

which eventually delegates to `console.log` somehow.

== Standalone WASM

Also from that tutorial, there's a Caesar cypher using emscripten to generate just WASM:

```
$ emcc -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_caesarEncrypt', '_caesarDecrypt']" -Wl,--no-entry caesar.cpp -o caesar.wasm
```

We used a `STANDALONE_WASM` compiler flag, and output just the WASM, with no Javascript or HTML wrappers. To interact with the WASM we will need a driver, in Javascript for instance:

```javascript
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
})();
```

We can just put that in a `<script>` in the browser and it will interact with the WASM and print stuff to the console. Go to http://localhost:8000/caesar.html and look at console.

== Random Numbers

Random numbers come from the standard library in C, so that might be interesting:

```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

void printit()
{
	for (int i = 0; i < 5; i++)
	{
		printf("%f\n", rand()/(float)RAND_MAX);
	}
}

int main() {
	time_t t;
	srand((unsigned) time(&t));
	printf("%s\n", "Starting...");
	return 0;
}
```

Using emscripten to generate Javascript and WASM:

```
$ emcc -Os -s EXPORTED_FUNCTIONS="['_printit','_main']" -s EXPORT_ES6=1 randoms.c -o randoms.js
```

It also works in Node, but you'll need `type=module` in `package.json` in order to use the ES6 code (or copy it to `random.mjs`). The generated Javascript is kind of [buggy](https://github.com/emscripten-core/emscripten/issues/11792) so you have to set up some globals:

```
$ node
Welcome to Node.js v16.13.1.
Type ".help" for more information.
> await import('path').then(path => globalThis.__dirname = path.dirname('./randoms.js'));
> await import('module').then(module => globalThis.require = module.createRequire(new URL("file://" + process.cwd())));
> var randoms = await import('./randoms.mjs').then(module => module.default({ locateFile: function (path) { return './' + path; } }));
randoms._printit()
0.830624
0.165981
0.218746
0.534809
0.715307
```

(If you see errors "Uncaught SyntaxError: await is only valid in async function" then you need to upgrade Node.js - it works with version 16 and better.)

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
	const buffer = new Uint8Array(memory.buffer, 0, plaintext.length);
	buffer.set(encoder.encode(plaintext), 0);

	reverse(buffer, buffer.length);
	console.log(buffer);
	console.log(decoder.decode(buffer));
	buffer.set(Array(buffer.length).fill(0)); // null out input
})();
```

and run:

```
$ node
Welcome to Node.js v16.13.2.
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

If we put that code straight into `reverse.js` we might get a nasty surprise - the `reverse()` function and the `greet()` function can and will write on each other's buffer. So we need to null out the buffers after we finish with them, e.g:

```javascript
buffer.set(Array(buffer.length).fill(0));
```

== Global Data

A WASM has a (dynamic, growable) buffer of memory. We have seen it being used above in a couple of places. Sneakily we have been using address 0 of the buffer provided by the `WebAssembly.Memory` without asking if anyone else might be using it. It turned out OK because no-one was. Look again at the WATM for `hello.wasm` and you will see the `hello world` message being loaded in to global data. The `reverse.wasm` does the same thing with the `"Hello "` prefix that is used in the `greet` function:

```wasm
(module
  (table $__indirect_function_table (;0;) (export "__indirect_function_table") 1 1 funcref)
  (memory $memory (;0;) (export "memory") 256 256)
  (global $global0 (mut i32) (i32.const 5244416))
...
  (data (i32.const 1024) "Hello ")
  (data (i32.const 1033) "\06P")
)
```

There is a magic number 1024 marking the start of global data and we can confirm this by inspecting it in Javascript. It's an offset from the start of the `WebAssembly.Memory` buffer:

```javascript
> const wasm = await import('fs').then(fs => fs.readFileSync('reverse.wasm')).then(file => WebAssembly.instantiate(file))
> const { memory, reverse, greet } = wasm.instance.exports;
> new Uint8Array(memory.buffer, 1024, 6)
Uint8Array(6) [ 72, 101, 108, 108, 111, 32 ]
```

== Arrays of Data Structures

What would an array of strings need to look like in Javascript so that a WASM would understand it? Let's set up a static array in C and export it via a function:

```c
char *words[] = {
	"four",
	"pink",
	"rats"
};

char **list() {
	return words;
}
```

with that in `reverse.c` we can compile:

```
$ emcc -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_reverse','_greet','_list']" -Wl,--no-entry "reverse.c" -o reverse.wasm
```

and call the function (after setting up the `wasm` as in the previous example):

```javascript
> wasm.instance.exports.list()
1048
```

That's a pointer to a location in global memory, but not right at the start of it. We can inspect the memory and see what it points at:

```javascript
new Uint8Array(memory.buffer, 1048, 12)
Uint8Array(12) [
  5, 4, 0, 0, 10,
  4, 0, 0, 0,  4,
  0, 0
]
```

That's a group of 3 specs for strings (arrays of char). There's one at offset 5 of length 4, one at offset 10 of length 4 and one at offset 0 or length 4. We can confirm that by looking at the memory in thos locations (the offsets are relative to the start of global data at 1024):

```javascript
> const decoder = new TextDecoder()
> decoder.decode(new Uint8Array(memory.buffer, 1024+5, 4))
'four'
> decoder.decode(new Uint8Array(memory.buffer, 1024+10, 4))
'pink'
> decoder.decode(new Uint8Array(memory.buffer, 1024, 4))
'rats'
```

We now know how to encode an array of strings to pass into the WASM as a function argument. For instance we could write this `find` function:

```c
int compare(const void *s1, const void *s2)
{
	const char *key = s1;
	const char *const *arg = s2;
	return strcmp(key, *arg);
}

char EMPTY[] = {};

char *find(char *value, char **strings, int length) {
	char **result = bsearch(value, strings, length, sizeof(char *), compare);
	return result != NULL ? *result : EMPTY;
}
```

and call it from Javascript to find the address of "rats" in the global `words` array (after recompiling the WASM to export this new function):

```
> var buffer = new Uint8Array(memory.buffer, 0, 5)
> buffer.set(encoder.encode("rats"))
> wasm.instance.exports.find(buffer, 1048, 3)
1024
```

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

