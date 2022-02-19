package com.example.driver;

import io.github.kawamuray.wasmtime.wasi.*; import io.github.kawamuray.wasmtime.*;

class DemoApplication {
	public static void main(String[] args) throws Exception {
		WasiCtx wasi = new WasiCtxBuilder().inheritStdio().inheritStderr().inheritStdin().build();
		var store = Store.withoutData(wasi);
		Engine engine = store.engine();
		Linker linker = new Linker(store.engine());
		WasiCtx.addToLinker(linker);
		var module = io.github.kawamuray.wasmtime.Module.fromFile(engine, "./hello.wasm");
		linker.module(store, "", module);
		linker.get(store, "", "_start").get().func().call(store);
	}

}