package com.example.driver;

import java.util.Arrays;
import java.util.stream.IntStream;

import com.example.driver.PersonOuterClass.Person;

import io.github.kawamuray.wasmtime.Engine;
import io.github.kawamuray.wasmtime.Linker;
import io.github.kawamuray.wasmtime.Store;
import io.github.kawamuray.wasmtime.Val;
import io.github.kawamuray.wasmtime.wasi.WasiCtx;
import io.github.kawamuray.wasmtime.wasi.WasiCtxBuilder;

class DemoApplication {
	public static void main(String[] args) throws Exception {
		WasiCtx wasi = new WasiCtxBuilder().inheritStdio().inheritStderr().inheritStdin().build();
		var store = Store.withoutData(wasi);
		Engine engine = store.engine();
		Linker linker = new Linker(store.engine());
		WasiCtx.addToLinker(linker);
		var module = io.github.kawamuray.wasmtime.Module.fromFile(engine, "wasmtime/person.wasm");
		linker.module(store, "", module);
		var memory = linker.get(store, "", "memory").get().memory();
		var buffer = memory.buffer(store);
		int ptr = (int) linker.get(store, "", "juergen").get().func().call(store)[0].getValue();
		System.err.println(ptr);
		IntStream.range(ptr, ptr + 20).forEach(index -> { buffer.position(index); System.err.println(buffer.get());});
		linker.get(store, "", "pack").get().func().call(store, Val.fromI32(ptr), Val.fromI32(0));
		byte[] bytes = new byte[16];
		buffer.position(0);
		buffer.get(bytes);
		Person juergen = Person.parseFrom(bytes);
		System.err.println(juergen);
	}

}