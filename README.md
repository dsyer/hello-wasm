Following tutorial at [wasmbyexample.dev](https://wasmbyexample.dev/examples/hello-world/hello-world.c.en-us.html).

Hello world using emscripten to generate HTML, Javascript and WASM (http://localhost:8000/hello.html and look at console):

```
$ emcc hello.c -O3 -o hello.html
$ node hello.js
hello, world!
$ python -m http.server 8000
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

Caesar cypher using emscripten to generate just WASM (http://localhost:8000/caesar.html and look at console):

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
1622652103
1530046529
1924524626
380441821
647550358
```