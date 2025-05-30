const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT;
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('✅ Voxa signaling server is live.');
});

const wss = new WebSocket.Server({ server });

let rooms = {};

wss.on('connection', (ws) => {
  let currentRoom = '';

  ws.on('message', (message) => {
    const { type, language, offer, answer, candidate } = JSON.parse(message);

    if (type === 'join') {
      if (!rooms[language]) rooms[language] = [];
      rooms[language].push(ws);
      currentRoom = language;

      if (rooms[language].length === 2) {
        rooms[language].forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'peer-joined' }));
          }
        });
      }
    }

    if (type === 'offer' || type === 'answer' || type === 'candidate') {
      if (rooms[currentRoom]) {
        rooms[currentRoom].forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, data: { offer, answer, candidate } }));
          }
        });
      }
    }
  });

  ws.on('close', () => {
    if (rooms[currentRoom]) {
      rooms[currentRoom] = rooms[currentRoom].filter((client) => client !== ws);
      rooms[currentRoom].forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'peer-left' }));
        }
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Voxa signaling server running on port ${PORT}`);
});
