package com.example.driver;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;

class DemoApplication {
    public static void main(String[] args) {
        Context polyglot = Context.create();
        Value array = polyglot.eval("js", "[1,2,42,4]");
        int result = array.getArrayElement(2).asInt();
        System.out.println(result);
    }
}