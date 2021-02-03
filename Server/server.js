const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const PORT = process.env.PORT || 3000;
const CLIENT_PATH = path.resolve(__dirname + '/../Client/');
const INDEX_FILE = path.join(CLIENT_PATH, 'index.html');

app.use(express.static(CLIENT_PATH));

http.listen(PORT, () => {
    console.log('listening on port ' + PORT);
});

io.on('connection', (socket) => {
    console.log('client is connected under socket id ' + socket.id);
});

app.get('/', (req, res) => {
    res.sendFile(INDEX_FILE);
});