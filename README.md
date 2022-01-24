Following tutorial at [wasmbyexample.dev](https://wasmbyexample.dev/examples/hello-world/hello-world.c.en-us.html). Hello world using emscripten to generate HTML, Javascript and WASM (http://localhost:8000/hello.html and look at console):

```
$ emcc hello.c -O3 -o hello.html
$ node hello.js
hello, world!
$ python -m http.server 8000
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

Also from that tutorial, there's a Caesar cypher using emscripten to generate just WASM (http://localhost:8000/caesar.html and look at console):

```
$ emcc -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_caesarEncrypt', '_caesarDecrypt']" -Wl,--no-entry "caesar.cpp" -o "caesar.wasm"
```

Reverse a string using emscripten to generate just WASM (http://localhost:8000/reverse.html and look at console):

```
$ emcc -Os -s STANDALONE_WASM -s EXPORTED_FUNCTIONS="['_reverse']" -Wl,--no-entry "reverse.c" -o "reverse.wasm"
```

Random numbers using emscripten to generate Javascript and WASM (http://localhost:8000/randoms.html and look at console):

```
$ emcc -Os -s EXPORTED_FUNCTIONS="['_printit','_main']" randoms.c -o randoms.js
```

Also works in Node:

```
$ node
Welcome to Node.js v16.13.1.
Type ".help" for more information.
> var randoms = require('./randoms.js')
undefined
> Starting...

> randoms._printit()
0.830624
0.165981
0.218746
0.534809
0.715307
```

Wordle (http://localhost:8000):

```
$ emcc -Os -s EXPORTED_FUNCTIONS="['_guess','_solution','_main', '_validate']" wordle.c -o wordle.js
```

Some lessons learned:

* The `-s STANDALONE_WASM` flag screws up the `time()` function - the return value and hence the random seed is always 0, so the game works but it's always the same word.
* Byte arrays from `TextEncoder.encode()` are not null terminated, but some functions in C depend on that. The WASM memory is initialized with nulls, so those functions work as long as you don't write into the memory above the string.
* You have to zero out the arrays that you pass to the WASM after using them, unless you don't care about leaking between calls, and possibly getting wrong results (null terminated strings).