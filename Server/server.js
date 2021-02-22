const express = require('express');
const { ExpressPeerServer } = require('peer');
const cors = require('cors');
const path = require('path');

const CLIENT_PATH = path.resolve(__dirname + '/../Client/');
const DOCUMENT_FILE = path.join(CLIENT_PATH, 'document.html');
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.static(CLIENT_PATH));

const server = app.listen(PORT, () => {
    console.log(`server listening on port ${PORT}`);
});

const peerServer = ExpressPeerServer(server, {
    debug: true,
    allow_discovery: true
});

app.use('/peerjs', peerServer);

app.get('/', (_req, res) => {
    res.sendFile(DOCUMENT_FILE);
});