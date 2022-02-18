with import <nixpkgs> { };

let
  pythonPackages = python3Packages;
in mkShell {

  name = "env";
  buildInputs = [
    pythonPackages.python
    pythonPackages.venvShellHook
    figlet emscripten nodejs cmake check protobuf protobufc pkg-config
  ];

  venvDir = "./.venv";
  postVenvCreation = ''
    unset SOURCE_DATE_EPOCH
    pip install wasmtime
  '';

  postShellHook = ''
    # allow pip to install wheels
    unset SOURCE_DATE_EPOCH
    figlet ":wasm:"
  '';

}