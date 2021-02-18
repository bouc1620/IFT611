const express = require('express');
const { ExpressPeerServer } = require('peer');
const app = express();
const http = require('http').Server(app);
const path = require('path');

const PORT = process.env.PORT || 3000;
const CLIENT_PATH = path.resolve(__dirname + '/../Client/');
const INDEX_FILE = path.join(CLIENT_PATH, 'index.html');
const DOCUMENT_FILE = path.join(CLIENT_PATH, 'document.html');

const peerServer = ExpressPeerServer(http, {
    debug: true,
    path: '/connection'
  });

app.use('/peerjs', peerServer);
app.use(express.static(CLIENT_PATH));

http.listen(PORT, () => {
    console.log('listening on port ' + PORT);
});

app.get('/', (req, res) => {
    res.sendFile(INDEX_FILE);
});

app.get('/document/', (req, res) => {
    res.sendFile(DOCUMENT_FILE);
});