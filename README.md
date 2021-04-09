# Projet ift611, Éditeur de texte collaboratif en temps réel
- Nicholas Vézina, vezn2502
- Charles Boudreault, bouc1620

Le réseau fonctionne sur un système de pair-à-pair avec la bibliothèque [PeerJS](https://peerjs.com/) basée sur [WebRTC](https://webrtc.org/). La structure de données contenant le document, assurant la cohérence entre les versions et faisant le plus de travail de calcul fonctionne sous WebAssembly. Le code du module WebAssembly est écrit en C++ et a ensuite été transpilé à l'aide de [Emscripten](https://emscripten.org/) et est trouvable dans le répertoire cpp à la racine du dépôt.

## Installation
Le module WebAssembly existe sous forme déjà transpilée sous client/wasm/data-module.wasm. Le script build_wasm.sh à la racine du dépôt peut être roulé pour retranspiler le module à partir du code source C++ et écraser l'ancien. Ce script utilise l'image Docker de Emscripten et détruit le conteneur une fois la tâche complétée.

Le reste est un simple projet JavaScript dont les dépendances s'installent avec l'outil NPM. Pour rouler l'application il ne suffit donc de faire:

```bash
npm install
npm run release
```
Node roulera l'application en local sur le port 3000. Il faut bien-sûr ouvrir plusieurs fenêtres de navigateur à localhost:3000 pour voir le fonctionnement de l'application.