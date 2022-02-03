with import <nixpkgs> { };
mkShell {
  name = "env";
  buildInputs = [ figlet emscripten nodejs python3 cmake check protobuf protobufc pkg-config ];
  shellHook = ''
    figlet ":wasm:"
  '';
}
