const OPERATION = {
  INSERT: 1,
  DELETE: 2,
  REPLACE: 3,
  REQUEST_DOCUMENT: 4,
  SEND_DOCUMENT: 5,
  REQUEST_CURSOR: 6,
  SEND_CURSOR: 7,
  SEND_TEST_NETWORK: 8,
  RECEIVE_TEST_NETWORK: 9
};

let documentData;
let peer;
let connections;

// start the app once the WebAssembly module is fully loaded
Module.onRuntimeInitialized = () => {
  documentData = new Document(1000);

  peer = new Peer(
    peerID, {
    host: '/',
    port: '3000',
    path: '/peerjs'
  });

  connections = new Map();

  // connect to other peers when joining the network
  peer.on('open', () => {
    peer.listAllPeers((others) => {
      others = others.filter((other) => other != peerID);

      if (others.length == 0) {
        editor.codemirror.options.readOnly = false;
        return;
      }

      others.sort((a, b) => b - a);
      let index = others.findIndex((other) => other < peerID);
      if (index == -1) {
        index = others[others.length - 1];
      }

      for (const other of others) {
        let link = peer.connect(other);
        link.on('data', (data) => receiveData(data, link));

        // ask for a copy of the document
        if (other == index) {
          link.on('open', () => {
            link.send(JSON.stringify({
              operation: OPERATION.REQUEST_DOCUMENT,
              payload: null
            }));
          });
        }

        connections.set(other, link);
      }
    });
  });

  // listen to new peers joining the network
  peer.on('connection', (link) => {
    link.on('data', (data) => receiveData(data, link));
    connections.set(link.peer, link);
  });
};

/**
 * A closure that filters out disconnected peers after a number of operations broadcast
 */
const refreshPeers = (function () {
  const WAIT = 10; // the number of broadcasts between each verification
  let current = 0;

  return () => {
    if (current++ >= WAIT) {
      peer.listAllPeers((others) => {
        for (const other of connections.keys()) {
          if (others.find((other_) => other_ == other) == undefined) {
            documentData.removeCursor(other);
            connections.delete(other);
          }
        }
      });
      current = 0;
    }
  };
})();

/**
 * Broadcasts an operation on the document to the network
 * @param {object} message
 */
function broadcast (message) {
  refreshPeers();
  message = JSON.stringify(message);
  for (const link of connections.values()) {
    link.send(message);
  }
}

/**
 * Receives operations on the document from other peers
 * @param {JSON} data 
 * @param {DataConnection} link 
 */
function receiveData (data, link) {
  let t0 = performance.now();
  data = JSON.parse(data);

  switch (data.operation) {
    case OPERATION.INSERT:
      documentData.insert_fromRemote(data.payload);
      break;
    case OPERATION.DELETE:
      documentData.delete_fromRemote(data.payload);
      break;
    case OPERATION.REPLACE:
      documentData.replace_fromRemote(data.payload);
      break;
    case OPERATION.REQUEST_DOCUMENT:
      link.send(JSON.stringify({
        operation: OPERATION.SEND_DOCUMENT,
        payload: documentData.getDocument()
      }));
      break;
    case OPERATION.SEND_DOCUMENT:
      documentData.copyDocument(data.payload);
      break;
    case OPERATION.REQUEST_CURSOR:
      link.send(JSON.stringify({
        operation: OPERATION.SEND_CURSOR,
        payload: {
          user: peerID,
          position: editor.codemirror.getCursor()
        }
      }));
      break;
    case OPERATION.SEND_CURSOR:
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
      console.error('received unexpected operation type');
  }
  let t1 = performance.now();
  console.log(`Operation ` + data.operation + ` : ${t1 - t0} ms.`);
}