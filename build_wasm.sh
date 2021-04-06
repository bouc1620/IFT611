#!/bin/bash

rm client/wasm -rf
mkdir client/wasm
printf "Compilation en cours des fichiers C++ vers WebAssembly...\n\n"

set -x
docker run --rm -v /$(pwd):/src emscripten/emsdk \
  emcc --bind -O2 -s "EXPORTED_FUNCTIONS=['_malloc', '_free']" \
  -s ALLOW_MEMORY_GROWTH=1 -s WASM=1 \
  cpp/data-module/data-module/Document.cpp cpp/data-module/data-module/Character.cpp \
  -o client/wasm/data-module.js
set +x

if  [[ $1 = "-s" ]];
then
  cp client/wasm/data-module.js client/wasm/data-module.wasm cpp/test/wasm
  cd cpp/test
  printf "\nLe serveur test écoute sur le port 8000."
  python -m http.server
else
  printf "\nUtilisez l'option -s pour tester le module WebAssembly compilé dans un navigateur."
fi