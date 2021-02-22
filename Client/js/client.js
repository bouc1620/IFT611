const self = new Peer({
    host: '/',
    port: '3000',
    path: "/peerjs"
});

self.on('open', () => {
    console.log(`connected with id ${self.id}`);
    self.listAllPeers((peers) => {
        let index = peers.indexOf(self.id);
        if (index !== -1) {
            if (peers.length === 1) {
                console.log('no other peers connected');
                return;
            }
            peers.splice(index, 1);
        }

        let message = 'other peers connected: \n';
        for (const peer of peers)
            message += `${peer}\n`;
        console.log(message);
    });
});