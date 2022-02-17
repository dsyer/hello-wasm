from wasmtime import *
engine = Engine()
store = Store(engine)
module = Module.from_file(engine, "./reverse.wasm")
instance = Instance(store, module, [])
exports = instance.exports(store)
memory = exports["memory"]
import ctypes
buffer = (c_ubyte*memory.data_len(store)).from_address(addressof(memory.data_ptr(store).contents))
buffer[0:10] = "helloworld".encode()
print buffer[0:10]
exports["reverse"](store, 0, 10)
print buffer[0:10]