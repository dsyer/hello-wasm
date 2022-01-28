with import <nixpkgs> { };
mkShell {
  name = "env";
  buildInputs = [ figlet emscripten nodejs python3 ];
  shellHook = ''
    figlet ":wasm:"
  '';
}
