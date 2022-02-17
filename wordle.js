var Module = typeof Module !== "undefined" ? Module : {};
var objAssign = Object.assign;
var moduleOverrides = objAssign({}, Module);
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = (status, toThrow) => { throw toThrow };
var ENVIRONMENT_IS_WEB = typeof window === "object";
var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
var ENVIRONMENT_IS_NODE = typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string";
var scriptDirectory = "";
function locateFile(path) { if (Module["locateFile"]) { return Module["locateFile"](path, scriptDirectory) } return scriptDirectory + path } var read_, readAsync, readBinary, setWindowTitle;
function logExceptionOnExit(e) {
    if (e instanceof ExitStatus) return;
    let toLog = e;
    err("exiting due to exception: " + toLog)
} var fs;
var nodePath;
var requireNodeFS;
if (ENVIRONMENT_IS_NODE) {
    if (ENVIRONMENT_IS_WORKER) { scriptDirectory = require("path").dirname(scriptDirectory) + "/" } else { scriptDirectory = __dirname + "/" } requireNodeFS = (() => {
        if (!nodePath) {
            fs = require("fs");
            nodePath = require("path")
        }
    });
    read_ = function shell_read(filename, binary) {
        requireNodeFS();
        filename = nodePath["normalize"](filename);
        return fs.readFileSync(filename, binary ? null : "utf8")
    };
    readBinary = (filename => {
        var ret = read_(filename, true);
        if (!ret.buffer) { ret = new Uint8Array(ret) } return ret
    });
    readAsync = ((filename, onload, onerror) => {
        requireNodeFS();
        filename = nodePath["normalize"](filename);
        fs.readFile(filename, function (err, data) {
            if (err) onerror(err);
            else onload(data.buffer)
        })
    });
    if (process["argv"].length > 1) { thisProgram = process["argv"][1].replace(/\\/g, "/") } arguments_ = process["argv"].slice(2);
    if (typeof module !== "undefined") { module["exports"] = Module } process["on"]("uncaughtException", function (ex) { if (!(ex instanceof ExitStatus)) { throw ex } });
    process["on"]("unhandledRejection", function (reason) { throw reason });
    quit_ = ((status, toThrow) => {
        if (keepRuntimeAlive()) {
            process["exitCode"] = status;
            throw toThrow
        } logExceptionOnExit(toThrow);
        process["exit"](status)
    });
    Module["inspect"] = function () { return "[Emscripten Module object]" }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    if (ENVIRONMENT_IS_WORKER) { scriptDirectory = self.location.href } else if (typeof document !== "undefined" && document.currentScript) { scriptDirectory = document.currentScript.src } if (scriptDirectory.indexOf("blob:") !== 0) { scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1) } else { scriptDirectory = "" } {
        read_ = (url => {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, false);
            xhr.send(null);
            return xhr.responseText
        });
        if (ENVIRONMENT_IS_WORKER) {
            readBinary = (url => {
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                xhr.responseType = "arraybuffer";
                xhr.send(null);
                return new Uint8Array(xhr.response)
            })
        } readAsync = ((url, onload, onerror) => {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = (() => {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                    onload(xhr.response);
                    return
                } onerror()
            });
            xhr.onerror = onerror;
            xhr.send(null)
        })
    } setWindowTitle = (title => document.title = title)
} else { } var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.warn.bind(console);
objAssign(Module, moduleOverrides);
moduleOverrides = null;
if (Module["arguments"]) arguments_ = Module["arguments"];
if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
if (Module["quit"]) quit_ = Module["quit"];
var wasmBinary;
if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
var noExitRuntime = Module["noExitRuntime"] || true;
if (typeof WebAssembly !== "object") { abort("no native wasm support detected") } var wasmMemory;
var ABORT = false;
var EXITSTATUS;
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
function updateGlobalBufferAndViews(buf) {
    buffer = buf;
    Module["HEAP8"] = HEAP8 = new Int8Array(buf);
    Module["HEAP16"] = HEAP16 = new Int16Array(buf);
    Module["HEAP32"] = HEAP32 = new Int32Array(buf);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(buf)
} var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 16777216;
var wasmTable;
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
var runtimeKeepaliveCounter = 0;
function keepRuntimeAlive() { return noExitRuntime || runtimeKeepaliveCounter > 0 } function preRun() {
    if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) { addOnPreRun(Module["preRun"].shift()) }
    } callRuntimeCallbacks(__ATPRERUN__)
} function initRuntime() {
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__)
} function preMain() { callRuntimeCallbacks(__ATMAIN__) } function exitRuntime() { runtimeExited = true } function postRun() {
    if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) { addOnPostRun(Module["postRun"].shift()) }
    } callRuntimeCallbacks(__ATPOSTRUN__)
} function addOnPreRun(cb) { __ATPRERUN__.unshift(cb) } function addOnInit(cb) { __ATINIT__.unshift(cb) } function addOnPostRun(cb) { __ATPOSTRUN__.unshift(cb) } var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function addRunDependency(id) {
    runDependencies++;
    if (Module["monitorRunDependencies"]) { Module["monitorRunDependencies"](runDependencies) }
} function removeRunDependency(id) {
    runDependencies--;
    if (Module["monitorRunDependencies"]) { Module["monitorRunDependencies"](runDependencies) } if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null
        } if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback()
        }
    }
} Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
function abort(what) {
    { if (Module["onAbort"]) { Module["onAbort"](what) } } what = "Aborted(" + what + ")";
    err(what);
    ABORT = true;
    EXITSTATUS = 1;
    what += ". Build with -s ASSERTIONS=1 for more info.";
    var e = new WebAssembly.RuntimeError(what);
    throw e
} var dataURIPrefix = "data:application/octet-stream;base64,";
function isDataURI(filename) { return filename.startsWith(dataURIPrefix) } function isFileURI(filename) { return filename.startsWith("file://") } var wasmBinaryFile;
wasmBinaryFile = "wordle.wasm";
if (!isDataURI(wasmBinaryFile)) { wasmBinaryFile = locateFile(wasmBinaryFile) } function getBinary(file) { try { if (file == wasmBinaryFile && wasmBinary) { return new Uint8Array(wasmBinary) } if (readBinary) { return readBinary(file) } else { throw "both async and sync fetching of the wasm failed" } } catch (err) { abort(err) } } function getBinaryPromise() { if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) { if (typeof fetch === "function" && !isFileURI(wasmBinaryFile)) { return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function (response) { if (!response["ok"]) { throw "failed to load wasm binary file at '" + wasmBinaryFile + "'" } return response["arrayBuffer"]() }).catch(function () { return getBinary(wasmBinaryFile) }) } else { if (readAsync) { return new Promise(function (resolve, reject) { readAsync(wasmBinaryFile, function (response) { resolve(new Uint8Array(response)) }, reject) }) } } } return Promise.resolve().then(function () { return getBinary(wasmBinaryFile) }) } function createWasm() {
    var info = { "a": asmLibraryArg };
    function receiveInstance(instance, module) {
        var exports = instance.exports;
        Module["asm"] = exports;
        wasmMemory = Module["asm"]["b"];
        updateGlobalBufferAndViews(wasmMemory.buffer);
        wasmTable = Module["asm"]["i"];
        addOnInit(Module["asm"]["c"]);
        removeRunDependency("wasm-instantiate")
    } addRunDependency("wasm-instantiate");
    function receiveInstantiationResult(result) { receiveInstance(result["instance"]) } function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function (binary) { return WebAssembly.instantiate(binary, info) }).then(function (instance) { return instance }).then(receiver, function (reason) {
            err("failed to asynchronously prepare wasm: " + reason);
            abort(reason)
        })
    } function instantiateAsync() {
        if (!wasmBinary && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) && typeof fetch === "function") {
            return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function (response) {
                var result = WebAssembly.instantiateStreaming(response, info);
                return result.then(receiveInstantiationResult, function (reason) {
                    err("wasm streaming compile failed: " + reason);
                    err("falling back to ArrayBuffer instantiation");
                    return instantiateArrayBuffer(receiveInstantiationResult)
                })
            })
        } else { return instantiateArrayBuffer(receiveInstantiationResult) }
    } if (Module["instantiateWasm"]) {
        try {
            var exports = Module["instantiateWasm"](info, receiveInstance);
            return exports
        } catch (e) {
            err("Module.instantiateWasm callback failed with error: " + e);
            return false
        }
    } instantiateAsync();
    return {}
} function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
        var callback = callbacks.shift();
        if (typeof callback == "function") {
            callback(Module);
            continue
        } var func = callback.func;
        if (typeof func === "number") { if (callback.arg === undefined) { getWasmTableEntry(func)() } else { getWasmTableEntry(func)(callback.arg) } } else { func(callback.arg === undefined ? null : callback.arg) }
    }
} function getWasmTableEntry(funcPtr) { return wasmTable.get(funcPtr) } function handleException(e) { if (e instanceof ExitStatus || e == "unwind") { return EXITSTATUS } quit_(1, e) } function _time(ptr) {
    var ret = Date.now() / 1e3 | 0;
    if (ptr) { HEAP32[ptr >> 2] = ret } return ret
} var asmLibraryArg = { "a": _time };
var asm = createWasm();
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function () { return (___wasm_call_ctors = Module["___wasm_call_ctors"] = Module["asm"]["c"]).apply(null, arguments) };
var _solution = Module["_solution"] = function () { return (_solution = Module["_solution"] = Module["asm"]["d"]).apply(null, arguments) };
var _validate = Module["_validate"] = function () { return (_validate = Module["_validate"] = Module["asm"]["e"]).apply(null, arguments) };
var _reset = Module["_reset"] = function () { return (_reset = Module["_reset"] = Module["asm"]["f"]).apply(null, arguments) };
var _guess = Module["_guess"] = function () { return (_guess = Module["_guess"] = Module["asm"]["g"]).apply(null, arguments) };
var _main = Module["_main"] = function () { return (_main = Module["_main"] = Module["asm"]["h"]).apply(null, arguments) };
var calledRun;
function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status
} var calledMain = false;
dependenciesFulfilled = function runCaller() {
    if (!calledRun) run();
    if (!calledRun) dependenciesFulfilled = runCaller
};
function callMain(args) {
    var entryFunction = Module["_main"];
    var argc = 0;
    var argv = 0;
    try {
        var ret = entryFunction(argc, argv);
        exit(ret, true);
        return ret
    } catch (e) { return handleException(e) } finally { calledMain = true }
} function run(args) {
    args = args || arguments_;
    if (runDependencies > 0) { return } preRun();
    if (runDependencies > 0) { return } function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        preMain();
        if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
        if (shouldRunNow) callMain(args);
        postRun()
    } if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout(function () {
            setTimeout(function () { Module["setStatus"]("") }, 1);
            doRun()
        }, 1)
    } else { doRun() }
} Module["run"] = run;
function exit(status, implicit) {
    EXITSTATUS = status;
    if (keepRuntimeAlive()) { } else { exitRuntime() } procExit(status)
} function procExit(code) {
    EXITSTATUS = code;
    if (!keepRuntimeAlive()) {
        if (Module["onExit"]) Module["onExit"](code);
        ABORT = true
    } quit_(code, new ExitStatus(code))
} if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) { Module["preInit"].pop()() }
} var shouldRunNow = true;
if (Module["noInitialRun"]) shouldRunNow = false;
run();

