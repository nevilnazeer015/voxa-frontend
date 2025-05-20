// App.jsx
import React, { useEffect, useRef, useState } from 'react';
import './App.css';

const SIGNALING_SERVER_URL = 'wss://voxa-signaling-clean.onrender.com';

export default function App() {
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerRef = useRef(null);
  const wsRef = useRef(null);

  const [muted, setMuted] = useState(false);
  const [language, setLanguage] = useState('english');

  const [otherJoined, setOtherJoined] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!callStarted) return;

    wsRef.current = new WebSocket(SIGNALING_SERVER_URL);

    wsRef.current.onopen = () => {
      wsRef.current.send(JSON.stringify({ type: 'join', language }));
      setStatus('📞 Calling...');
    };

    wsRef.current.onmessage = async (event) => {
      const { type, data } = JSON.parse(event.data);

      if (type === 'offer') {
        const pc = createPeer(false);
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        wsRef.current.send(JSON.stringify({ type: 'answer', answer }));
        setInCall(true);
        setStatus('🎧 Connected');
      }

      if (type === 'answer') {
        peerRef.current.setRemoteDescription(data.answer);
        setInCall(true);
        setStatus('🎧 Connected');
      }

      if (type === 'candidate') {
        peerRef.current.addIceCandidate(data.candidate);
      }

      if (type === 'peer-joined') {
        setOtherJoined(true);
        callUser();
      }

      if (type === 'peer-left') {
        setOtherJoined(false);
        setInCall(false);
        setStatus('🔌 User disconnected');
        endCall();
      }
    };

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      localStreamRef.current = stream;
    });

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (peerRef.current) peerRef.current.close();
    };
  }, [callStarted]);

  const createPeer = (isInitiator) => {
    const pc = new RTCPeerConnection();
    localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));

    pc.ontrack = (e) => {
      remoteAudioRef.current.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        wsRef.current.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
      }
    };

    peerRef.current = pc;
    return pc;
  };

  const callUser = async () => {
    const pc = createPeer(true);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    wsRef.current.send(JSON.stringify({ type: 'offer', offer }));
    setStatus('📞 Calling...');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks()[0].enabled = muted;
      setMuted(!muted);
    }
  };

  const endCall = () => {
    if (peerRef.current) peerRef.current.close();
    setInCall(false);
    setCallStarted(false);
    setStatus('Call ended');
    window.location.reload();
  };

  return (
    <div className="container">
      <h1 className="title">Voxa Voice</h1>

      {!callStarted && (
        <>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="dropdown"
          >
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
            <option value="arabic">Arabic</option>
            <option value="spanish">Spanish</option>
          </select>

          <button className="primary" onClick={() => setCallStarted(true)}>
            🎙️ Tap to Talk
          </button>
        </>
      )}

      {callStarted && (
        <>
          {status && <p className="status">{status}</p>}

          <div className="controls">
            {inCall ? (
              <>
                <button onClick={toggleMute}>
                  {muted ? '🎤 Unmute' : '🔇 Mute'}
                </button>
                <button onClick={endCall}>❌ End Call</button>
              </>
            ) : (
              <button onClick={endCall}>❌ Cancel</button>
            )}
          </div>

          <div className="info">
            {inCall && <span className="joined">🟢 User connected</span>}
            {!inCall && callStarted && <span className="waiting">🕒 Waiting for user...</span>}
            <span>🌍 Language: {language}</span>
          </div>
        </>
      )}

      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}
