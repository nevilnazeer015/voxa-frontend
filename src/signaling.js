const socket = new WebSocket('ws://localhost:3001');

socket.addEventListener('open', () => {
  console.log('✅ Connected to signaling server');
});

export const sendSignal = (type, data) => {
  socket.send(JSON.stringify({ type, data }));
};

export const onSignalReceived = (handler) => {
  socket.onmessage = async (event) => {
    if (event.data instanceof Blob) {
      const text = await event.data.text();
      const message = JSON.parse(text);
      handler(message);
    } else {
      handler(JSON.parse(event.data));
    }
  };
};
