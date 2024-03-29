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

```c++
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

```c++
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

```c++
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

## Handwritten WASM

You can write simple logic in `.wat` and compile it with `wat2wasm`. E.g. a completely trivial `add()` function:

```wasm
(module
  (func (export "add") (param $p1 i32) (param $p2 i32) (result i32)
    local.get $p1
    local.get $p2
    i32.add
  )
)
```

Compile and run:

```javascript
$ wat2wasm add.wat > add.wasm
$ node
>   var wasm = await WebAssembly.instantiate(fs.readFileSync('add.wasm'))
> wasm.instance.exports.add(3,4)
7
```

### Async Functions

The Rust tooling has extensive support for async functions in WASM using the `wasm-bindgen` crate. It generates a *lot* of JavaScript which makes it mostly unsuitable for polyglot scenarios since you can only run WASM binaries that are generated with those bindings. Instead, we can pick apart what is going on in the `bindgen` code and try and simplify it.

Suppose we want to export a function "call" from a WASM that calls out to an imported "get". The simplest possible implementation is just a delegation:

```wasm
(module
  (type $0 (func))
  (import "env" "get" (func $get (type $0)))
  (func $call (type $0)
    call $get
  )
  (export "call" (func $call))
)
```

Now imagine if the "get" function wants to be asynchronous, so in JavaScript it returns a `Promise`. Well it can't because there is no sane representation of a promise in WASM. But it can manipulate global (or module-scoped) state, so you can stash the promise in a global variable:

```javascript
let promise;
const get = () =>  {
	promise = new Promise((resolve, reject) => {
		resolve(
			// Do whatever you need to produce a result, e.g.
			123
		);
	});
}

wasm = await WebAssembly.instantiate(file, {"env": {"get": get}});
```

and then export a wrapper for the WASM "call" which returns the global:

```javascript
export async function call() {
	wasm.instance.exports.call();
	return promise;
}
```

This will then work:

```javascript
$ wat2wasm async.wat > async.wasm
$ node
> var as = await import("./async.mjs")
> await as.call()
123
```

but it's not very interesting because the result of the promise is never handed back to the WASM for processing. To make it more useful we need the WASM to be able to export a callback that we then apply to the result of the imported "get":

```javascript
const get = () =>  {
	promise = new Promise((resolve, reject) => {
		resolve(123)
		  .then(value => wasm.instance.exports.callback(value));
	});
}
```

and we can define the callback in the WASM:

```wasm
(module
  (type $0 (func))
  (type $1 (func (param i32) (result i32)))
  ...
  (func $callback (type $1) (param $value i32) (result i32)
    local.get $value
    i32.const 321
    i32.add
  )
  (export "callback" (func $callback))
)
```

so that:

```javascript
> var as = await import("./async.mjs")
> await as.call()
444
```

Note that the exported and imported WASM functions that return a "promise" actually return void and the wrapper handles the promise as global state.

The `wasm-bindgen` generated code does essentially that. It looks for all the functions that return a promise, wraps them (with some mangled name), and manages the global state. To be safer and more generic the state is an array instead of a single global variable, and all the WASM functions return an integer instead of void, which is an index into the global array.

If the "call" function does something more interesting than simply delegating to "get" then the implementation of the WASM gets a bit more complicated, but only to the same extent that we expect "nested callback hell" when a language doesn't have native async.

### Virtual Function Dispatch

A virtual function can be described using a "table" in the WASM. The example in `dispatch.wat` exports a function "dispatch" that simply calls one of the 3 functions in the table. The table is declared to have 4 elements:

```
(table (;0;) 4 4 funcref)
```

and is initialized so that it can point to functions 0-2 (starting at offset 1):

```
(elem (;0;) (i32.const 1) func 0 1 2)
```

The exported function is defined like this - it says "take the input parameter and call the function (of type 0) with that offset":

```
(func (;3;) (type 1) (param i32) (result i32)
  local.get 0
  call_indirect (type 0)
)
```

I.e. `dispatch(n)` calls function `n-1`. You can compile it:

```
$ wat2wasm dispatch.wat > dispatch.wasm
```

and see it running:

```javascript
> const wasm = await WebAssembly.instantiate(fs.readFileSync('./test.wasm'));
> wasm.instance.exports.dispatch(3)
1
> wasm.instance.exports.dispatch(2)
2
> wasm.instance.exports.dispatch(1)
3
```

## Arrays of Data Structures

What would an array of strings need to look like in Javascript so that a WASM would understand it? Let's set up a static array in C and export it via a function:

```c++
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

```c++
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

```c++
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

```c++
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
$ EMMAKEN_CFLAGS=-I../protobuf/src EM_PKG_CONFIG_PATH=../protobuf emconfigure ./configure --host=none-none-none
$ EMMAKEN_CFLAGS='-I../protobuf/src -L../protobuf/src/.libs' emmake make
```

The `make` command above most likely will fail a couple of times, while it tries to run tests. You can't ignore it, but you can work around it. The first time it fails because `protoc-gen-c` is not executable (it's a WASM), but you can copy the system executable with the same name into the same location (and set the executable bit) to move past that by running the same make command again. The second failure is another non-executable WASM used in tests in `t/generated-code2/cxx-generate-packed-data`. You can get a binary executable to swap with that by running `./autogen.sh && ./configure && make` in a fresh clone. Copy the generated executable on top of the WASM and set the executable bit, then make again:

```
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

```c++
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
5247208 54321 Juergen
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

```c++
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

Protobufs have an `Any` type that lets you sling bytes if you know what type they are. You have to import it explicitly:

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

## Using the WASM Stack

A WASM generated with `-s STANDALONE_WASM` exports functions for stack manipulations:

```javascript
> var wasm = await import('fs').then(fs => fs.readFileSync('reverse.wasm')).then(file => WebAssembly.instantiate(file))
> wasm.instance.exports
[Object: null prototype] {
  memory: Memory [WebAssembly.Memory] {},
  reverse: [Function: 0],
  greet: [Function: 1],
  find: [Function: 3],
  list: [Function: 4],
  __indirect_function_table: Table [WebAssembly.Table] {},
  __errno_location: [Function: 5],
  stackSave: [Function: 7],
  stackRestore: [Function: 8],
  stackAlloc: [Function: 9]
}
```

Notice the 3 functions at the bottom. The first one `stackSave()` just tells you the address of the top of the stack:

```javascript
> wasm.instance.exports.stackSave()
5244448
```

then you can allocate space with `stackAlloc()`:

```javascript
> wasm.instance.exports.stackAlloc(10)
5244432
> wasm.instance.exports.stackSave()
5244432
```

The top of the stack is now at 5244432, which is 16 bytes lower than it started. Why 16? Well, you allocated 10 bytes and the WASM rounded that down to the nearest 4-bit boundary. The calculation it did was:

```javascript
> (5244448-10)&(-16)
5244432
```

which we can validate by looking at the WASM source code in the browser:

```wasm
(func $stackAlloc (;9;) (export "stackAlloc") (param $var0 i32) (result i32)
    global.get $global0
    local.get $var0
    i32.sub
    i32.const -16
    i32.and
    local.tee $var0
    global.set $global0
    local.get $var0
  )
```

`-16` is `fffffff0` in hex, so we just subtract the space requested and round down to the nearest half a byte. The `stackRestore()` function just resets the top of the stack to the value you pass in (there's no state management inside the WASM).

So to use the stack properly we should save the current value, allocate what you need, use it, zero it out, and then call `stackRestore()` with the saved value to return the memory.

```javascript
> var wasm = await import('fs').then(fs => fs.readFileSync('reverse.wasm')).then(file => WebAssembly.instantiate(file))
> var { memory, stackAlloc, stackSave, stackRestore, reverse, greet} = wasm.instance.exports
> const encoder = new TextEncoder();
> const decoder = new TextDecoder();
> var top = stackSave()
> var ptr = stackAlloc(11)
> var buffer = new Uint8Array(memory.buffer, ptr, 10)
> buffer.set(encoder.encode("helloworld"))
> reverse(ptr, buffer.length)
> decoder.decode(buffer)
'dlrowolleh'
> buffer.set(Array(buffer.length).fill(0));
> stackRestore(top)
```

If you generate the WASM without `-s STANDALONE_WASM` then the stack manipulation functions are not exported (or even present as far as I can see). It's unclear how you would manage memory except as we have done so far, by just using the buffer and keeping track of which parts of it are in use.

## Importing a Function

If we leave the `printy()` function undefined in `person.c`:

```c++
void printy(Person *person);

int main() {
	printy(juergen());
	return 0;
}
```

and compile with `-s ERROR_ON_UNDEFINED_SYMBOLS=0` then the undefined function shows up as an import in the WASM:

```wat
(module
  (func $env.print (;0;) (import "env" "printy") (param i32))
  ...
  (func $main (;9;) (export "main") (param $var0 i32) (param $var1 i32) (result i32)
    call $juergen
    call $env.printy
    i32.const 0
  )
)
```

and we have to inject an implementation into the module when we instantiate it. One way to do that is to provide `emscripten` with a [library callback](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#implement-a-c-api-in-javascript), e.g. in `person.lib.js`:

```javascript
mergeInto(LibraryManager.library, {
    printy: function (...args) {
        console.log("Args: " + args);
    }
});
```

and compile with a flag that points to it:

```
$ emcc -Os -I tmp/protobuf-c --js-library person.lib.js -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_main','_juergen','_size','_person__pack','_pack','_unpack']" tmp/protobuf-c/protobuf-c/.libs/libprotobuf-c.a tmp/protobuf/src/.libs/libprotobuf.a person.c person.pb-c.c -o person.js
$ node
Welcome to Node.js v16.13.2.
Type ".help" for more information.
> var person = require('./person.js')
undefined
> Args: 5246456
```

## Embedding in Java with GraalVM

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

That's because we are running a `main` entry point which has a call to `proc_exit()` (although older versions of `emcc` do not behave this way - probably they fixed a bug). We can re-arrange the WASM to just print and not exit:

```c++
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

```c++
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
jshell> var memory = context.getBindings("wasm").getMember("main").getMember("memory")
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

Our `reverse.wasm` was created as a standalone, so that will work if we can load the memory up for it.

```java
// load context with reverse.wasm, then...
jshell> var memory = context.getBindings("wasm").getMember("main").getMember("memory")
jshell> var reverse = context.getBindings("wasm").getMember("main").getMember("reverse")
jshell> int i=0; Arrays.asList("helloworld".split("")).forEach(c -> {memory.writeBufferByte(i,(byte)c.charAt(0)); i++;})
jshell> extract.apply(0)
$28 ==> "helloworld"

jshell> reverse.execute(0, 10)
$29 ==> wasm-void-result

jshell> extract.apply(0)
$30 ==> "dlrowolleh"
```

## Embedding in Java with Wasmtime-Java

Wasmtime doesn't have first class support for Java but there are some third party integrations with the binary libraries. [Kawamuray](https://github.com/kawamuray/wasmtime-java) is the easiest to use. (Use Java 11.0.14 or better to avoid some weird issues with the terminal freezing in Jshell when you copy-paste into it.)

```
$ jshell --class-path $HOME/.m2/repository/io/github/kawamuray/wasmtime/wasmtime-java/0.7.0/wasmtime-java-0.7.0.jar:$HOME/.m2/repository/ch/qos/logback/logback-classic/1.2.10/logback-classic-1.2.10.jar:$HOME/.m2/repository/org/slf4j/slf4j-api/1.7.33/slf4j-api-1.7.33.jar:$HOME/.m2/repository/ch/qos/logback/logback-core/1.2.10/logback-core-1.2.10.jar
|  Welcome to JShell -- Version 17.0.1
|  For an introduction type: /help intro
```

First compile the WASM:

```
$ cd wasmtime
$ emcc -Os -s STANDALONE_WASM ../hello.c -o hello.wasm
```

then

```java
jshell> import io.github.kawamuray.wasmtime.wasi.*; import io.github.kawamuray.wasmtime.*;
jshell> WasiCtx wasi = new WasiCtxBuilder().inheritStdio().inheritStderr().inheritStdin().build();
     var store = Store.withoutData(wasi);
     Engine engine = store.engine();
     Linker linker = new Linker(store.engine());
     WasiCtx.addToLinker(linker);
     var module = io.github.kawamuray.wasmtime.Module.fromFile(engine, "./hello.wasm");
     linker.module(store, "", module);
jshell> var func = linker.get(store, "", "_start").get().func()
jshell> func.call(store)
```

There's no output on stdout, just a `TrapException` when `proc_exit()` is called. Not sure what that means because it works if you run the app from the `java` command line (or use `mvn spring-boot:run`). If you use the version of `hello.wasm` without the main function:

```
$ emcc -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_hello', '_msg']" -Wl,--no-entry hello.c -o hello.wasm
```

then

```java
jshell> linker.get(store, "", "hello").get().func().call(store)
$43 ==> Val[0] {  }

jshell> linker.get(store, "", "msg").get().func().call(store)
$44 ==> Val[1] { Val(type=I32, value=1024) }
```

So the `msg()` call returns a pointer to WASM memory, which is good. You can extract the pointer using the `Val`:

```java
jshell> linker.get(store, "", "msg").get().func().call(store)[0].i32()
$45 ==> 1024
```

Interacting with the memory:

```java
jshell> var instance = new Instance(store, module, new ArrayList<>())
jshell> var memory = instance.getMemory(store, "memory").get()
jshell> var buffer = memory.buffer(store)
jshell> buffer.position(1024)
jshell> byte[] bytes = new byte[4];
jshell> buffer.get(bytes)
jshell> bytes
bytes ==> byte[4] { 114, 97, 116, 115 }

jshell> new String(bytes)
$37 ==> "rats"
```

and calling functions:

```java
jshell> buffer.position(0)
jshell> buffer.put("helloworld".getBytes())
jshell> bytes = new byte[10]; buffer.get(bytes)
jshell> bytes
bytes ==> byte[10] { 104, 101, 108, 108, 111, 119, 111, 114, 108, 100 }
jshell> instance.getFunc(store, "reverse").get().call(store, Val.fromI32(0), Val.fromI32(10))
jshell> buffer.position(0)
jshell> bytes
bytes ==> byte[10] { 100, 108, 114, 111, 119, 111, 108, 108, 101, 104 }
```

To use the memory without creating an `Instance` (which requires the imports to be defined), you need to make sure there is no `_start` function in the WASM. So compile with `-Wl,--no-entry`:

```
emcc -Os -I tmp/protobuf-c -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_juergen','_size','_person__pack','_print','_pack','_unpack']" -Wl,--no-entry tmp/protobuf-c/protobuf-c/.libs/libprotobuf-c.a tmp/protobuf/src/.libs/libprotobuf.a person.c person.pb-c.c -o wasmtime/person.wasm
```

And then we can access the memory in Java from the `Linker`:

```java
jshell> var memory = linker.get(store, "", "memory").get().memory();
```

### Protobufs

We can add `person.proto` to `src/main/proto` and some stuff to the build:

```xml
<dependencies>
	<dependency>
		...
		<groupId>com.google.protobuf</groupId>
		<artifactId>protobuf-java</artifactId>
		<version>3.18.0</version>
	</dependency>
</dependencies>

<build>
	<plugins>
		...
		<plugin>
			<groupId>org.xolstice.maven.plugins</groupId>
			<artifactId>protobuf-maven-plugin</artifactId>
			<version>0.6.1</version>
			<executions>
				<execution>
					<goals>
						<goal>compile</goal>
					</goals>
				</execution>
			</executions>
		</plugin>
	</plugins>
</build>
```

And then we can sling `Person` messages in and out of the WASM. We need to know the packed length of the `Person`, which the WASM will tell us using the `size()` convenience function we already defined.

```java
jshell> int ptr = (int) linker.get(store, "", "juergen").get().func().call(store)[0].getValue();
jshell> linker.get(store, "", "pack").get().func().call(store, Val.fromI32(ptr), Val.fromI32(0))
jshell> int size = (int) linker.get(store, "", "size").get().func().call(store, Val.fromI32(ptr))[0].getValue()
jshell> byte[] bytes = new byte[size];
jshell> buffer.position(0)
jshell> buffer.get(bytes)
jshell> bytes
bytes ==> byte[16] { 10, 5, 53, 52, 51, 50, 49, 18, 7, 74, 117, 101, 114, 103, 101, 110 }
```

and the generated `Person` can decode those bytes:

```java
jshell> Person.parseFrom(bytes)
$49 ==> id: "54321"
name: "Juergen"
```

Going the other way:

```java
jshell> var josh = Person.newBuilder().setName("Josh").setId("12345").build()
jshell> bytes = josh.toByteArray()
jshell> buffer.position(0)
jshell> buffer.put(bytes)
jshell> linker.get(store, "", "unpack").get().func().call(store, Val.fromI32(0), Val.fromI32(bytes.length))[0].getValue()
$59 ==> 5247784
```

The result at the end there is a pointer to a `Person` which we could pass to a WASM function that accepted a `*Person`.

## Embedding in Python

There is a [`wasmtime`](https://github.com/bytecodealliance/wasmtime-py) library that you can `pip install` and use to load and run a WASM (or WAT). Example:

```python
from wasmtime import *
engine = Engine()
store = Store(engine)
module = Module.from_file(engine, "./reverse.wasm")
instance = Instance(store, module, [])
exports = instance.exports(store)
memory = exports["memory"]
```

If you run the code above in a REPL you can poke at the memory:

```python
>>> memory.data_ptr(store)[1024:1048]
[114, 97, 116, 115, 0, 102, 111, 117, 114, 0, 112, 105, 110, 107, 0, 72, 101, 108, 108, 111, 32, 0, 0, 0]
```

That's `["rats", "four", "pink"]` and "Hello", as we can see from the WASM binary:

```wat
module(
	...
	(data (i32.const 1024) "rats\00four\00pink\00Hello ")
	...
)
```

The next block is the array of four pink rats:

```python
>>> memory.data_ptr(store)[1048:1060]
[5, 4, 0, 0, 10, 4, 0, 0, 0, 4, 0, 0]
```

giving us the addresses of the string constants as `4*256 + [5, 10, 0]` or `[1029, 1034, 1024]`.

Just like in Javascript, we can call functions in the WASM by passing it pointers to its own memory:

```python
>>> data = memory.data_ptr(store)
>>> for i,v in enumerate("helloworld".encode('utf-8')): data[i] = v
...
```

or

```python
>>> import ctypes
>>> data = (c_ubyte*memory.data_len(store)).from_address(addressof(memory.data_ptr(store).contents))
>>> data[0:10] = "helloworld".encode()
>>> data[0:10]
[104, 101, 108, 108, 111, 119, 111, 114, 108, 100]
>>> exports["reverse"](store, 0, 10)
>>> data[0:10]
[100, 108, 114, 111, 119, 111, 108, 108, 101, 104]
```

> NOTE: you can't assign to a slice of the memory buffer, which seems like a bug (or at least a missing feature) in `wasmtime-py`, hence the use of `enumerate()` above.

### WASI in Python

We can set up WASI preview imports using a utility:

```python
from wasmtime import *
engine = Engine()
store = Store(engine)
module = Module.from_file(engine, "./hello.wasm")
linker = Linker(engine)
linker.define_wasi()
wasi = WasiConfig()
wasi.inherit_stdout()
store.set_wasi(wasi)
instance = linker.instantiate(store, module)
exports = instance.exports(store)
```

The version of `hello.wasm` above that calls `proc_exit()` generates a similar error to the Java app:


```python
>>> exports["_start"](store)
hello, world!
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
  File "/usr/local/lib/python3.9/dist-packages/wasmtime/_func.py", line 100, in __call__
    raise WasmtimeError._from_ptr(error)
  File "/usr/lib/python3.9/contextlib.py", line 124, in __exit__
    next(self.gen)
  File "/usr/local/lib/python3.9/dist-packages/wasmtime/_func.py", line 263, in enter_wasm
    raise trap_obj
wasmtime._trap.ExitTrap: Exited with i32 exit status 0
wasm backtrace:
    0:  0x723 - <unknown>!<wasm function 10>
```

but it works. And the version of `hello.wasm` that doesn't have the main entry point works without errors:

```python
>>> exports["hello"](store)
hello, world!
```

### Inspecting the Exports

It's a bit like the exports in Javascript, including the stack manipulation functions:

```python
>>> exports.__dict__['_extern_map'].keys()
dict_keys(['memory', 'hello', 'msg', '__indirect_function_table', 'fflush', '__errno_location', 'stackSave', 'stackRestore', 'stackAlloc'])
```

### Random Numbers

If we compile `randoms.wasm` with `-s STANDALONE_WASM`:

```python
>>> from wasmtime import *
engine = Engine()
store = Store(engine)
module = Module.from_file(engine, "./randoms.wasm")
linker = Linker(engine)
linker.define_wasi()
wasi = WasiConfig()
wasi.inherit_stdout()
store.set_wasi(wasi)
instance = linker.instantiate(store, module)
exports = instance.exports(store)
>>> exports.__dict__['_extern_map'].keys()
dict_keys(['memory', 'printit', 'main', '__indirect_function_table', '_start'])
>>> exports["_start"](store)
Starting...
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
... # proc_exit() being called
>>> exports["printit"](store)
0.764245
0.252648
0.996302
0.709899
0.938538
```

You can catch and ignore the exception if you want to:

```python
>>> try:
  exports["_start"](store)
except ExitTrap as err:
  print(err)
Starting...
Exited with i32 exit status 0
wasm backtrace:
    0: 0x178e - <unknown>!<wasm function 22>
```


## Functions Returning Pointers

WASM functions that return pointers are mainly only useful if you know the length of the data they refer to. You could make assumptions about null termination, but they would only work with strings, and not even then if the source language didn't have null-termination. So it's better to pack the length into a struct along with the data and return that. This is supported in WASM, e.g. here is a function that simply reflects the input

```wat
(module
  (memory (export "memory") 2 3)
  (func (export "reflect") (param i32) (param i32) (result i32) (result i32)
    local.get 0
    local.get 1)
)
```

Multivalued parameters in C would be structs, and `emcc` supports that with "experimental" features. So a simple echo function with memory allocation for the result might look like this with parameters and returns passed by value:

```c
#include <stdlib.h>
#include <string.h>

typedef struct _buffer {
    size_t *data;
    int len;
} buffer;

buffer echo(buffer input) {
    size_t *output = malloc(input.len);
    memcpy(output, input.data, input.len);
    buffer result = {
        output,
        input.len
    };
    return result;
}
```

It can be compiled to a WASM like this:

```
$ emcc -mmultivalue -Xclang -target-abi -Xclang experimental-mv -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_echo']" -Wl,--no-entry echo.c -o echo.wasm
```

If you call that function in the JVM you get back an array of `Val` of length 2 - the pointer and the length.

## cJSON

There is a lightweight JSON parser in C at [cJSON](https://github.com/DaveGamble/cJSON). You can compile it to a wasm:

```
$ funcs="'_"$(grep CJSON_PUBLIC external/cJSON.h | sed -e 's/.* \(cJSON_.*\)(.*/\1/' | egrep -v '#' | tr '\n' "%" | sed -e "s/%/', '_/g" -e "s/, '_$//")
$ emcc -Os -s EXPORTED_FUNCTIONS="[$funcs]" -Wl,--no-entry external/cJSON.c -o cJSON.wasm
$ ls -l cJSON.wasm
-rwxr-xr-x 1 dsyer dsyer 51445 Apr  7 16:08 cJSON.wasm
```

You can call the functions and f they return non-primitives they will be pointers. E.g.

```javascript
> var wasm = await WebAssembly.instantiate(fs.readFileSync('cJSON.wasm'));
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
> var versionPtr = wasm.instance.exports.cJSON_Version();
> decoder.decode(wasm.instance.exports.memory.buffer.slice(versionPtr,versionPtr+5))
'1.7.7'
```

Parse a JSON string (don't put it at address 0 because cJSON treats 0 as NULL and errors out):

```
> new Uint8Array(memory.buffer, 1, 40).set(encoder.encode('{"message":"hello world"}'))
  var ptr = cJSON_Parse(1)
> memory.buffer.slice(ptr, ptr+36)
ArrayBuffer {
  [Uint8Contents]: <00 00 00 00 00 00 00 00 28 0c 50 00 40 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00>,
  byteLength: 36
}
```

we can see that better in 32 bit chunks:

```
> new Uint32Array(memory.buffer, ptr, 9)
Uint32Array(9) [ 0, 0, 5245992, 64, 0, 0, 0, 0, 0 ]
```

that's a `*cJSON`, which is defined like this:

```c++
typedef struct cJSON
{
    /* next/prev allow you to walk array/object chains. Alternatively, use GetArraySize/GetArrayItem/GetObjectItem */
    struct cJSON *next;
    struct cJSON *prev;
    /* An array or object item will have a child pointer pointing to a chain of the items in the array/object. */
    struct cJSON *child;

    /* The type of the item, as above. */
    int type;

    /* The item's string, if type==cJSON_String  and type == cJSON_Raw */
    char *valuestring;
    /* writing to valueint is DEPRECATED, use cJSON_SetNumberValue instead */
    int valueint;
    /* The item's number, if type==cJSON_Number */
    double valuedouble;

    /* The item's name string, if this item is the child of, or is in the list of subitems of an object. */
    char *string;
} cJSON;
```

so we can recognize the fields:

```json
{
	prev: 0,
	next: 0,
	value: 5245992,
	type: 64,
	valuestring: 0,
	valueint: 0,
	valuedouble: 0,
	string: 0
}
```

Only 2 fields are relevant here:

* `value` is a pointer to another `cJSON` 
* `type` is "object" - `64 = 1<<6` and `#define cJSON_Object (1 << 6)` from `cJSON.h`

The value is

```javascript
> new Uint32Array(memory.buffer, 5245992, 9)
Uint32Array(9) [ 0, 0, 0, 16, 5246056, 0, 0, 0, 5246040 ]
```

which is

```json
{
	prev: 0,
	next: 0,
	value: 0,
	type: 16,
	valuestring: 5246056,
	valueint: 0,
	valuedouble: 0,
	string: 5246040
}
```

* `type` is "string" (`#define cJSON_String (1 << 4)`)
* `valuestring` is a pointer to a string: "hello world"
* `string` is a pointer to the name of the field: "message"

```javascript
> decoder.decode(new Uint8Array(memory.buffer, 5246056, 11))
'hello world'
> decoder.decode(new Uint8Array(memory.buffer, 5246040, 7))
'message'
```

## MessagePack

[MessagePack](https://msgpack.org/) is a generic binary encoding with broad polyglot support. It's like JSON, but binary. In C you can read and write buffers with [`mpack.c`](https://github.com/ludocode/mpack), and in JavaScript there is [`@msgpack/msgpack`](https://www.npmjs.com/package/@msgpack/msgpack). So with this function in `message.c` we can extract a "message" and transfer its value to "msg":

```C
#include "external/mpack.h"

typedef struct _buffer {
    char *data;
    size_t len;
} buffer;

buffer *xform(char *input, size_t len)
{
	mpack_tree_t tree;
	mpack_tree_init_data(&tree, input, len);
	mpack_tree_parse(&tree);
	mpack_node_t root = mpack_tree_root(&tree);

	mpack_writer_t writer;
	buffer *result = malloc(sizeof(buffer));
	mpack_writer_init_growable(&writer, &result->data, &result->len);
	mpack_build_map(&writer);
	mpack_write_cstr(&writer, "msg");
	mpack_write_cstr(&writer, mpack_node_str(mpack_node_map_cstr(root, "message")));
	mpack_complete_map(&writer);
	mpack_writer_destroy(&writer);

	return result;
}
```

Compile it:

```
$ emcc -Os -s EXPORTED_FUNCTIONS="[_xform]" -Wl,--no-entry message.c external/mpack.c -o message.wasm
```

Then in Node.js:

```javascript
> var msgpack = await import('@msgpack/msgpack')
  var wasm = await WebAssembly.instantiate(fs.readFileSync('message.wasm'))
  var msg = msgpack.encode({message: "Hello World"})
  new Uint8Array(wasm.instance.exports.memory.buffer, 1, msg.length).set(msg)
> var result = wasm.instance.exports.xform(1,msg.length)
> new Uint32Array(wasm.instance.exports.memory.buffer, result, 2)
Uint32Array(2) [ 5248552, 17 ]
```

The result is a pointer to the output buffer and its length:

```javascript
> wasm.instance.exports.memory.buffer.slice(5248552, 5248552+17)
ArrayBuffer {
  [Uint8Contents]: <81 a3 6d 73 67 ab 48 65 6c 6c 6f 20 57 6f 72 6c 64>,
  byteLength: 17
}
```

We can read that according to the spec as

* 81: a map with one element
* a3: string key of length 3
* 6d 73 67: "msg"
* ab: string value of length 11
* 65 6c 6c 6f 20 57 6f 72 6c 64: "Hello World"

> NOTE: The multivalue WASM support [fails to compile `mpack.c`](https://github.com/llvm/llvm-project/issues/55136) so we had to use a pointer instead of a value for the return buffer.