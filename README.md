# Hello WASM

## Getting Started

Following tutorial at [wasmbyexample.dev](https://wasmbyexample.dev/examples/hello-world/hello-world.c.en-us.html). Hello world using emscripten to generate HTML, Javascript and WASM:

```
$ emcc hello.c -O3 -o hello.html
$ node hello.js
hello, world!
$ python -m http.server 8000
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

Go to http://localhost:8000/hello.html and look at console to see the output. It also shows up in the HTML.

### Deconstructing the WASM

If we look at the WASM binary in a browser it converts to WATM, a text representation:

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

## Standalone WASM

Also from that tutorial, there's a Caesar cypher using emscripten to generate just WASM:

```
$ emcc -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_caesarEncrypt', '_caesarDecrypt']" -Wl,--no-entry caesar.cpp -o caesar.wasm
```

We asked the compiler to output just the WASM, with no Javascript or HTML wrappers. In addition we used the `STANDALONE_WASM` compiler flag, which tries to make the code as portable as possible (e.g. it could work on other runtimes like Wasmer).  To interact with the WASM we will need a driver, in Javascript for instance:

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

We can just put that in a `<script>` in the browser and it will interact and print stuff to the console. Go to http://localhost:8000/caesar.html and look at console.

## Random Numbers

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

There's a `randoms.html` that you can open in the browser. It also works in Node, but you'll need `type=module` in `package.json` in order to use the ES6 code (or copy it to `random.mjs`). The generated Javascript is kind of [buggy](https://github.com/emscripten-core/emscripten/issues/11792) so you have to set up some globals:

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

## String Transformation

Reverse a string using emscripten to generate just WASM:

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

Also works in the browser at http://localhost:8000/reverse.html and look at console.

## Pointers

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

We had to `malloc` the space for the return value there, so that's a sign that memory management is going to be a massive burden from now on. Ignoring that for now, let's compile:

```
$ emcc -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_reverse','_greet']" -Wl,--no-entry "reverse.c" -o "reverse.wasm"
```

Then we can play with it in Javascript. The value that is returned from `greet` will be an index into the `memory` array.

```javascript
const wasm = await import('fs').then(fs => fs.readFileSync('reverse.wasm')).then(file => WebAssembly.instantiate(file))
const { memory, greet } = wasm.instance.exports;

const name = "World";
const value = new Uint8Array(memory.buffer, 0, name.length + 1);
value.set(encoder.encode(name), 0);
const result = new Uint8Array(memory.buffer, greet(value), name.length + 6);
console.log(result);
console.log(decoder.decode(result));
```

Output:

```
Uint8Array(11) [72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, ... ]
Hello World
```

We needed to know magically that the result was 6 characters longer than the input. Or we could have worked it out by finding the null terminator using some logic:

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

## Global Data

A WASM has a (dynamic, growable) linear buffer of memory. We have seen it being used above in a couple of places. Sneakily we have been using address 0 of the buffer provided by the `WebAssembly.Memory` without asking if anyone else might be using it. It turned out OK because no-one was. Phew.

Look again at the WATM for `hello.wasm` and you will see the `hello world` message being loaded into global data. The `reverse.wasm` does the same thing with the `"Hello "` prefix that is used in the `greet` function:

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

The location of the global data in the binary is not mandated by the spec, as far as I can tell. It seems to be set to 1024 by default in emscripten.

## Arrays of Data Structures

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

## More Data Structures

Let's define a simple struct and export an array of them:

```c
#include <stdbool.h>

struct word {
	char* word;
	bool common;
};

typedef struct word Word;

Word words[] = {
	{
		"four",
		true
	},
	{
		"pink",
		false
	},
	{
		"rats",
		true
	}
};

Word* list() {
	return words;
}
```

Compile:

```
$ emcc -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_list']" -Wl,--no-entry "words.c" -o words.wasm
```

and wrap in some Javascript:

```javascript
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
```

Then we can explore:

```
var words = require('./words.js')
> words.list()
1040
> new Uint8Array(words.memory.buffer, 1040, 24)
Uint8Array(24) [ 5, 4, 0, 0, 1, 0, 0, 0, 10, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 1, 0, 0, 0 ]
```

We can group those into arrays of length 8 which itself can be grouped into 2 sections representing the 2 fields in the struct `{word: [<offset>, <length>, 0, 0], common: [<bool>, 0, 0, 0]]` (the zeros are just padding). This makes it obvious how to decode the content:

```javascript
> let extract = function(ptr, index) {
	const args=new Uint8Array(words.memory.buffer, ptr + index*8, 8);
	return {
		word: decoder.decode(new Uint8Array(words.memory.buffer, 1024+args[0], args[1])),
		common: args[4] ? true : false
	};
}
> extract(1040, 0)
{ word: 'four', common: true }
> extract(1040, 1)
{ word: 'pink', common: false }
> extract(1040, 2)
{ word: 'rats', common: true }
```

## Wordle

See http://localhost:8000 for demo:

```
$ emcc -Os -s EXPORTED_FUNCTIONS="['_guess','_solution','_main', '_validate', '_reset']" wordle.c -o wordle.js
```

Some lessons learned:

* The `-s STANDALONE_WASM` flag screws up the `time()` function - the return value and hence the random seed is always 0, so the game works but it's always the same word.
* Byte arrays from `TextEncoder.encode()` are not null terminated, but some functions in C depend on that, so you have to pass in a buffer with the extra null. The WASM memory is initialized with nulls, so those functions work as long as you don't write into the memory above the string.
* You have to zero out the arrays that you pass to the WASM after using them, otherwise you can leak between calls, and get wrong results (null terminated strings again).
* A buffer of length 1 is always an empty string, even if the first element is non-null in Javascript. That's why we always create buffers with size `value.length + 1` to pass a string `value` down into the WASM.

## Protobufs

Given this simple protobuf:

```
syntax = "proto3";
message Person {
	string id = 1;
	string name = 2;
}
```

### Javascript

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

Because it's by Google, the generated code also exports `proto.Person` into the global scope, so that works as a synonym for `pkg.Person`. There are command line options for `import_style=es6` as well, but it _doesn't_ generate an ES6 module, or indeed anything that works on its own the way the `commonjs` version did. Might go back to that one day, but it doesn't seem like anyone intended it to be useful.

### Protobufs in C

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

### WASM

The `Person` type is just a plain struct, so it can be compiled and used directly:

```
$ emcc -Os -I /usr/include/google -s EXPORTED_FUNCTIONS="['_main']"  person.c -o person.js
```

N.B. running in Node.js it *doesn't* work with the version that ships with `emsdk`, so you have to compile and run in different terminals. So the vanilla `person.js` is a CommonJS script (hence you have to remove the `type=module` from `package.json`):

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

But the convenience functions from protobufs are not available because we haven't linked them, even though they are declared in the generated header. To link those we will need WASM compiled versions of the libraries.

### Building Protobuf

Building `protobuf` for WASM (https://github.com/protocolbuffers/protobuf) using emscripten wasn't too complicated. First let's set up a build area:

```
$ mkdir tmp
$ cd tmp
$ git clone https://github.com/protocolbuffers/protobuf
$ cd protobuf
```

Check the `PROTOBUF_VERSION` in the system:

```
$ grep PROTOBUF_VERSION /usr/include/google/protobuf/stubs/common.h 
#define GOOGLE_PROTOBUF_VERSION 3012004
```

That means `3.12.4` is installed, so we'll grab that and compile it:

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

There are loads of warnings about `LLVM version appears incorrect (seeing "12.0", expected "11.0")` but it seems to work.

### Building Protobuf-c

Checkout and prepare:

```
$ cd ..
$ git clone https://github.com/protobuf-c/protobuf-c
$ cd protobuf-c
```

Building `protobuf-c` is trickier because it has to point back to the `protobuf` build, and also has to be a compatible version (hence the `3.12.4` tag in `protobuf`):

```
$ ./autogen.sh
$ EMMAKEN_CFLAGS=-I../protobuf/src EM_PKG_CONFIG_PATH=../protobuf emconfigure ./configure --host=none-none-none --enable-wasm
$ EMMAKEN_CFLAGS='-I../protobuf/src -L../protobuf/src/.libs' emmake make
$ find . -name \*.a
./protobuf-c/.libs/libprotobuf-c.a
```

### Compiling Protobufs to WASM

The Ubuntu system `emscripten` fails to compile our `person.c` ("Error: Cannot find module 'acorn'"), but if you get the latest `emcc` from [`emsdk`](https://github.com/emscripten-core/emsdk) it works ():

```
$ emcc -Os -I /usr/include/google -s EXPORTED_FUNCTIONS="['_main','_juergen','_size','_person__pack','_print','_pack','_unpack']" tmp/protobuf-c/protobuf-c/.libs/libprotobuf-c.a tmp/protobuf/src/.libs/libprotobuf.a person.c person.pb-c.c -o person.js
```

This generates a new Javascript module `person.js`. There are some utility functions in `person.c`:

```c
void pack(Person *person, uint8_t *out) {
	person__pack(person, out);
}

Person *unpack(uint8_t *data, int len) {
	return person__unpack(NULL, len, data);
}

void print(Person *person) {
	printf("%ld %s %s\n", (long) person, person->id, person->name);
}
```

We can use them like this:

```javascript
> var person = require('./person.js')
undefined
> 5247208 54321 Juergen
> person._pack(5247208, person.HEAP8)
> person.HEAP8.slice(0, 20)
Int8Array(20) [
   10,   5, 53,  52,  51,  50,  49,
   18,   7, 74, 117, 101, 114, 103,
  101, 110,  0,   0,   0,   0
]
```

There's Juergen, packed into the root of the buffer. We can sling him around a bit:


```javascript
> person._unpack(person.HEAP8, 16)
5247232
> person.HEAP8.slice(5247232, 5247232 + 24)
Int8Array(24) [
  -40,  6,  0, 0,  0,  0,  0, 0,
    0,  0,  0, 0, 24, 17, 80, 0,
   40, 17, 80, 0, 19,  0,  0, 0
]
> person._print(5247232)
5247232 54321 Juergen
```

And we can copy data over from Javascript to the WASM:

```javascript
> var pkg = require('./person_pb')
> var m = new pkg.Person(['12345', 'Josh'])
> person.HEAP8.set(m.serializeBinary())
undefined
> person.HEAP8.slice(0,24)
Int8Array(24) [
  10,  5,  49,  50,  51, 52, 53, 18,
   4, 74, 111, 115, 104,  0,  0,  0,
   0,  0,   0,   0,   0,  0,  0,  0
]
> person._unpack(person.HEAP8, 13)
5247288
> person._print(5247288)
5247288 12345 Josh
```

Notice that in both examples above we had to know the length of the packed binary person (16 for Juergen, and 13 for Josh). For Josh we can compute it easily from the Javascript object as `m.serializeBinary().length`. For Juergen we have to delegate to the WASM since it created the pointer:

```javascript
> var person = require('./person.js')
undefined
> 5247208 54321 Juergen
> person._size(5247208)
16
```

To copy a protobuffer from WASM memory into Javascript we need a two step process - convert it first to packed binary and then deserialize:

```javascript
> person._pack(5247208, person.HEAP8)
> var pkg = require('./person_pb')
> var p = pkg.Person.deserializeBinary(new Uint8Array(person.HEAP8.slice(0,64)))
> p.toObject()
{ id: '54321', name: 'Juergen' }
```

### Binary Representations

Now it's time to get to grips with the layout of a `Person` in memory.

First the protobuf binary packing format which we can inspect with `_pack` (or `serializeBinary()` from the Javascript side):

```javascript
> person._pack(5247208, person.HEAPU8)
undefined
> person.HEAPU8.slice(0,16)
Uint8Array(16) [
   10,   5,  53,  52,  51,  50,
   49,  18,   7,  74, 117, 101,
  114, 103, 101, 110
]
```

Juergen is 2 strings packed as 2 field groups concatenated together: `[10, 5, ...]` and `[18, 7, ...]`. The second number in the field group is the length of the string, and the remainder is the character data. The first number is an encoding of the field type and index: `(index<<3) + type`, where the type for string is 2 (same for all length-delimited data). See the [Protobuf docs](https://developers.google.com/protocol-buffers/docs/encoding) for more detail. Integers (and booleans and enums) are encoded as "varint", so they are a bit of a special case to decode - you can't just throw them into the mix as ints in C.

Then we can look at what happens when the `Person` is not binary packed. Here's Juergen in the _unsigned_ view of the WASM memory:

```javascript
> person.HEAPU8.slice(5247208, 5247208+20)
Uint8Array(20) [
   104, 7, 0, 0,  0, 0,
     0, 0, 0, 0,  0, 0,
   132, 4, 0, 0, 65, 4,
     0, 0
]
```

The last two 4-byte groups there are pointers to Juergen's id and name respectively. We know this because of the way the `Person` struct was defined in the generated code:

```c
struct  _Person
{
  ProtobufCMessage base;
  char *id;
  char *name;
};
```

Because Juergen was initialized from constants in `person.c` we can expect the addresses to be in the global statics range (1024 and above). So an educated guess will tell us that the "4" in each case is a high order byte (4*256) and the other is the low order byte:

```javascript
> 65 + 4*256
1089
> 132 + 4*256
1156
```

So we have located Juergen's data:

```javascript
> const decoder = new TextDecoder() 
> decoder.decode(person.HEAP8.slice(1156, 1156+5))
'54321'
> decoder.decode(person.HEAP8.slice(1089, 1089+7))
'Juergen'
```

The first 4 bytes in the binary data for Juergen are a pointer to the field descriptor (names, types, indexes, etc.). Here's what that slice looks like in the raw:

```javascript
> var start = 104 + 256*7;
> person.HEAPU8.slice(start, start + 60)
Uint8Array(60) [
  249, 238, 170, 40,  58, 4, 0, 0, 58, 4, 0, 0,
   58,   4,   0,  0, 222, 4, 0, 0, 20, 0, 0, 0,
    2,   0,   0,  0, 176, 7, 0, 0, 16, 8, 0, 0,
    1,   0,   0,  0,  32, 8, 0, 0,  3, 0, 0, 0,
    0,   0,   0,  0,   0, 0, 0, 0,  0, 0, 0, 0
]
```

There are 15 fields there, nicely grouped by Node.js into 5 rows of 3. The first is a magic number. The next three are all `[58, 4]` which is a pointer to the name of the message ("Person"). Then is the package name which in this case is empty (`4*256+222` is null). Then is the size (20) and the field count (2), followed by a pointer to the field descriptors (`7*256+176 = 1968`). You can read the rest in `protobuf-c.h` in the declaration of `ProtobufCMessageDescriptor`.

Using all this data we could do reflection on a protobuf object in C, if all we had was the raw memory. In practice that is unlikely to be a useful insight because if we have the memory we also have the source code, and hence the proto file. We could even reverse engineer the proto file from the other sources if necessary. A more likely scenario is that we encounter a packed binary object and we don't know its proto type. That's what `proto.Any` is for.

## Protobuf Any

Protobufs have an `Any` type that lets you sling bytes if you know what type that are. You have to import it explicitly:

```javascript
> var anypb = require('google-protobuf/google/protobuf/any_pb')
> var any = new anypb.Any()
```

Then we can copy Josh over into the `Any`:

```javascript
> var josh = new proto.Person(['12345', 'Josh'])
> var buffer = new Uint8Array(josh.serializeBinary().length)
> buffer.set(josh.serializeBinary())
> any.pack(buffer, 'proto.Person')
```

We can check that the values are as expected:

```javascript
> any.getValue_asU8()
Uint8Array(13) [ 10, 5, 49, 50, 51, 52, 53, 18, 4, 74, 111, 115, 104 ]
> any.toObject()
{
  typeUrl: 'type.googleapis.com/proto.Person',
  value: 'CgUxMjM0NRIESm9zaA=='
}
```

and we can deserialize it back to a `Person`:

```javascript
> var p = any.unpack(proto.Person.deserializeBinary, 'proto.Person')
> p.toObject()
{ id: '12345', name: 'Josh' }
```

The type name `proto.Person` is arbitrary - you can put any value in there you like, as long as it matches in the `pack` and `unpack`.

Unfortunately, protobuf-c doesn't have support for `Any` typed data. The C++ library does, however.

## Embedding WASM in Java

With [GraalVM](https://www.graalvm.org/) you can [embed a WASM](https://www.graalvm.org/22.0/reference-manual/wasm/#embedding-webassembly-programs) into a Java program. The WASI builtins (C standard libraries) are supported. First install the WASM runtime, from a shell where GraalVM is the JDK:

```
$ gu install wasm
```

There is now a WASM runtime in the Polyglot support, and a `wasm` executable. If we take the `hello.c` from the first example above and recompile it to a standalone WASM:

```
$ emcc -Os -s STANDALONE_WASM hello.c -o hello.wasm
```

Then we can run it on the command line:

```
$ wasm hello.wasm
hello, world!
```

Amazing. We can embed it in Java like this (look in the "driver" subdirectory in the source code for sample code):

```java
import java.nio.file.Files;
import java.nio.file.Paths;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.io.ByteSequence;

class DemoApplication {

public static void main(String[] args) throws Exception {
		byte[] binary = Files.readAllBytes(Paths.get("hello.wasm"));
		Context.Builder contextBuilder = Context.newBuilder("wasm");
		Source.Builder sourceBuilder = Source.newBuilder("wasm", ByteSequence.create(binary), "example");
		Source source = sourceBuilder.build();
		Context context = contextBuilder.build();

		context.eval(source);

		Value mainFunction = context.getBindings("wasm").getMember("main").getMember("_start");
		mainFunction.execute();
	}

}
```

When we run it, and we don't even need the GraalVM libraries on the classpath (they are packaged in the JVM), but we get a bit of a surprise:

```
$ java -cp target/classes/ -Dpolyglot.wasm.Builtins=wasi_snapshot_preview1 com.example.driver.DemoApplication
hello, world!
Exception in thread "main" Program exited with status code 0.
        at <wasm> _start(Unknown)
        at org.graalvm.sdk/org.graalvm.polyglot.Value.execute(Value.java:839)
        at com.example.driver.DemoApplication.main(DemoApplication.java:22)
```

That's because we are running a `main` entry point which has a call to `proc_exit()`. We can re-arrange the WASM to just print and not exit:

```c
#include <stdio.h>
void hello() {
  printf("hello, world!\n");
}
```

Recompile:

```
$ emcc -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_hello']" -Wl,--no-entry hello.c -o hello.wasm
```

and switch to `jshell` for experimentation:

```java
$ jshell -R -Dpolyglot.wasm.Builtins=wasi_snapshot_preview1
|  Welcome to JShell -- Version 17.0.2
|  For an introduction type: /help intro

jshell> import org.graalvm.polyglot.*; import org.graalvm.polyglot.io.*
jshell> byte[] binary = Files.readAllBytes(Paths.get("hello.wasm"))
    Context.Builder contextBuilder = Context.newBuilder("wasm");
    Source.Builder sourceBuilder = Source.newBuilder("wasm", ByteSequence.create(binary), "example");
    Source source = sourceBuilder.build();
    Context context = contextBuilder.build();
    context.eval(source);
jshell> context.getBindings("wasm").getMember("main").getMember("hello").execute()
hello, world!
$10 ==> wasm-void-result
```

So now we know how to call a void function in a WASM from Java. What about pushing data in and out? We can add a function that returns a string:

```c
char* msg() {
  return "hello, world!\n";
}
```

and make sure it is included in the WASM export (`-s EXPORTED_FUNCTIONS="['_hello','_msg']"`), then look at the result:

```java
jshell> context.getBindings("wasm").getMember("main").getMember("msg").execute()
$17 ==> 1038
```

So we get back a pointer to the string. There's also a binding to the WASM memory and we can pull the data out from there. It's a bit more hassle than the JavaScript version because we have to copy all the data over byte by byte, instead of having slice operations on the buffer. But we can work with it, by creating some utility methods, for example:

```java
jshell> Function<Integer, String> extract = i -> {
	StringBuilder s = new StringBuilder(); 
	while (memory.readBufferByte(i)!=0) { 
		s.append((char)memory.readBufferByte(i)); i++;
	};
	return s.toString();
}
jshell> extract.apply(1038)
$50 ==> "hello, world!\n"
```

The GraalVM WASI builtins do not have the same bugs as the emscripten JavaScript ones, so for instance we can use `-s STANDALONE_WASM` and `srand((unsigned) time(NULL))` to seed a sequence of pseudo random numbers.