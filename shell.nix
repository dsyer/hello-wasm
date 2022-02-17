with import <nixpkgs> { };
mkShell {
  name = "env";
  buildInputs = [ figlet emscripten python3 nodejs cmake check protobuf protobufc pkg-config ];
  shellHook = ''
    figlet ":wasm:"
  '';
}
