package com.example.driver;

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