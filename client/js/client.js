const OPERATIONS = {
  INSERT: 0,
  DELETE: 1,
  REPLACE: 2,
  REQUEST_DOCUMENT: 3,
  SEND_DOCUMENT: 4,
  REQUEST_CURSOR: 5,
  SEND_CURSOR: 6,
  SEND_TEST_NETWORK: 7,
  RECEIVE_TEST_NETWORK: 8
};

const connections = [];

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
            operation: OPERATIONS.REQUEST_DOCUMENT,
            payload: null
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
            documentData.removeCursor(connections[i].id);
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
  let t0 = performance.now();
  data = JSON.parse(data);

  switch (data.operation) {
    case OPERATIONS.INSERT:
      documentData.insert_fromRemote(data.payload);
      break;
    case OPERATIONS.DELETE:
      documentData.delete_fromRemote(data.payload);
      break;
    case OPERATIONS.REPLACE:
      documentData.replace_fromRemote(data.payload);
      break;
    case OPERATIONS.REQUEST_DOCUMENT:
      link.send(JSON.stringify({
        operation: OPERATIONS.SEND_DOCUMENT,
        payload: documentData.document
      }));
      break;
    case OPERATIONS.SEND_DOCUMENT:
      documentData.copyDocument(data.payload);
      break;
    case OPERATIONS.REQUEST_CURSOR:
      link.send(JSON.stringify({
        operation: OPERATIONS.SEND_CURSOR,
        payload: {
          user: self.id,
          pos: editor.codemirror.getCursor()
        }
      }));
      break;
    case OPERATIONS.SEND_CURSOR:
      documentData.updateCursor(data.payload);
      break;
    case OPERATIONS.SEND_TEST_NETWORK:
      link.send(JSON.stringify({
        operation: OPERATIONS.RECEIVE_TEST_NETWORK,
        payload: data.payload
      }));
      break;
    case OPERATIONS.RECEIVE_TEST_NETWORK:
      let timeBefore = networkTimeMap.get(data.payload.id_map);
      let timeAfter = t0;

      //Divide by 2, because double times to send and received packet
      let timeAverage = (timeAfter - timeBefore) / 2;
      networkTimes.push(timeAverage);
      break;
    default:
      console.error(`received unexpected operation type : ${data.operation}`);
  }
  let t1 = performance.now();
  console.log(`Operation ` + data.operation + ` : ${t1 - t0} ms.`);
}