with import <nixpkgs> { };

mkShell {

  name = "env";
  buildInputs = [
    python3Packages.python
    python3Packages.venvShellHook
    figlet emscripten nodejs cmake check protobuf protobufc pkg-config wasmtime wabt
  ];

  venvDir = "./.venv";
  postVenvCreation = ''
    unset SOURCE_DATE_EPOCH
    pip install wasmtime
    pip install pyclibrary
  '';

  postShellHook = ''
    # allow pip to install wheels
    unset SOURCE_DATE_EPOCH
    mkdir -p ~/.emscripten
    chmod +w -R ~/.emscripten
    cp -rf ${emscripten}/share/emscripten/cache ~/.emscripten
    export EM_CACHE=~/.emscripten/cache
    figlet ":wasm:"
  '';

}