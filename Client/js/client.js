const connections = [];

const self = new Peer(
    peerID, {
    host: '/',
    port: '3000',
    path: '/peerjs'
});

// connect to other peers when joining the network
self.on('open', () => {
    self.listAllPeers(initPeers);
});

// listen to new peer joining the network
self.on('connection', (link) => {
    link.on('data', receiveData);

    for (var index = connections.length - 1; index > 0; --index) {
        if (connections[index].id < link.peer) {
            index++;
            break;
        }
    }

    connections.splice(index, 0, {
        id: link.peer,
        link: link
    });
});

function initPeers () {
    self.listAllPeers((peers) => {
        let index = peers.indexOf(self.id);
        if (index != -1) {
            if (peers.length == 1) {
                return;
            }
            peers.splice(index, 1);
        }

        peers.sort((a, b) => a - b);

        for (const peer of peers) {
            let link = self.connect(peer);
            link.on('data', receiveData);

            connections.push({
                id: peer,
                link: link
            });
        }
    });
}

function refreshPeers () {
    self.listAllPeers((peers) => {
        for (let i = connections.length - 1; i >= 0; i--) {
            if (peers.findIndex((peer) => peer == connections[i].id) == -1) {
                connections.splice(i, 1);
            }
        }
    });
}

function broadcast (message) {
    refreshPeers();
    for (const conn of connections) {
        conn.link.send(message);
    }
}

function receiveData (data) {
    data = JSON.parse(data);
    if (data.operation == 'insert') {
        documentData.insert_fromRemote(data.payload);
    } else if (data.operation == 'delete') {
        console.debug('received delete operation, not implemented yet');
    } else if (data.operation == 'replace') {
        console.debug('received replace operation, not implemented yet');
    } else if (data.operation == 'init') {
        console.debug('received init operation');
        documentData.copyDocument(data.payload);
    } else {
        console.error(`received unexpected operation type : ${data.operation}`);
    }
}