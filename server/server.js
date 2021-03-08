const express = require('express');
const { ExpressPeerServer } = require('peer');
const path = require('path');

const PEERS = new Set();
const CLIENT_PATH = path.resolve(__dirname + '/../Client/');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static(CLIENT_PATH));
app.set('view engine', 'pug');
app.set('views', CLIENT_PATH);

const server = app.listen(PORT, () => {
  console.debug(`peerjs server listening on port ${PORT}`);
});

app.get('/', (_req, res) => {
  let peerID = 0;
  while (PEERS.has(peerID))
    peerID++;
  PEERS.add(peerID);

  res.render('index', {
    peerID: peerID
  });
});

const peerServer = ExpressPeerServer(server, {
  debug: true,
  allow_discovery: true
});

app.use('/peerjs', peerServer);

peerServer.on('connection', (peer) => {
  console.debug(`peer ${peer.getId()} connected`);
});

peerServer.on('disconnect', (peer) => {
  const id = parseInt(peer.getId());
  if (PEERS.has(id)) {
    PEERS.delete(id);
    console.debug(`peer ${id} disconnected`);
  } else {
    console.error(`unknown peer has disconnected : peer id ${id}`);
  }
});