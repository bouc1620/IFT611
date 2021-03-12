const connections = [];

const operations = {
  INSERT: 0,
  DELETE: 1,
  REPLACE: 2,
  INIT: 3,
  COPY: 4,
  DEMAND_CURSOR: 5,
  UPDATE_CURSOR: 6
};

const self = new Peer(
  peerID, {
  host: '/',
  port: '3000',
  path: '/peerjs'
});

// connect to other peers when joining the network
self.on('open', () => {
  self.listAllPeers((peers) => {
    let index = peers.indexOf(self.id);
    if (index != -1) {
      peers.splice(index, 1);
    }

    if (peers.length == 0) {
      documentData.alreadyCopied = true;
      editor.codemirror.options.readOnly = false;
      return;
    }

    peers.sort((a, b) => b - a);
    index = peers.findIndex((peer) => peer < self.id);
    if (index == -1) {
      index = peers[peers.length - 1];
    }
    peers.reverse();

    for (const peer of peers) {
      let link = self.connect(peer);
      link.on('data', (data) => receiveData(data, link));

      // ask for a copy of the document
      if (peer == index) {
        link.on('open', () => {
          link.send(JSON.stringify({
            operation: operations.COPY,
            payload: ''
          }));
        });
      }

      connections.push({
        id: peer,
        link: link
      });
    }
  });
});

// listen to new peers joining the network
self.on('connection', (link) => {
  link.on('data', (data) => receiveData(data, link));

  // insertion into a sorted array
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

// filter out disconnected peers once in a while
var refreshPeers = (() => {
  const wait = 5; // the number of broadcasts between each refresh
  let current = 0;
  return () => {
    if (current++ >= wait) {
      self.listAllPeers((peers) => {
        for (let i = connections.length - 1; i >= 0; i--) {
          if (peers.findIndex((peer) => peer == connections[i].id) == -1) {
            connections.splice(i, 1);
          }
        }
      });
      current = 0;
    }
  };
})();

function broadcast (message) {
  refreshPeers();
  message = JSON.stringify(message);
  for (const conn of connections) {
    conn.link.send(message);
  }
}

function receiveData (data, link) {
  data = JSON.parse(data);

  switch (data.operation) {
    case operations.INSERT:
      documentData.insert_fromRemote(data.payload);
      break;
    case operations.DELETE:
      documentData.delete_fromRemote(data.payload);
      break;
    case operations.REPLACE:
      documentData.replace_fromRemote(data.payload);
      break;
    case operations.INIT:
      documentData.copyDocument(data.payload);
      break;
    case operations.COPY:
      link.send(JSON.stringify({
        operation: operations.INIT,
        payload: documentData.document
      }));
      break;
    case operations.DEMAND_CURSOR:
      link.send(JSON.stringify({
        operation: operations.UPDATE_CURSOR,
        user: self.id,
        pos: editor.codemirror.getCursor()
      }));
      break;
    case operations.UPDATE_CURSOR:
      documentData.updateCursorPosition(data.user, data.pos);
      break;
    default:
      console.error(`received unexpected operation type : ${data.operation}`);
  }
}