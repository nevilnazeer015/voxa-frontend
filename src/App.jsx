import React, { useEffect, useRef, useState } from 'react';
import './App.css';

const SIGNALING_SERVER_URL = 'wss://voxa-signaling-clean.onrender.com';

export default function App() {
  const pcRef = useRef();
  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [status, setStatus] = useState('Idle');
  const [language, setLanguage] = useState('english');
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const joinRequestedRef = useRef(false);

  useEffect(() => {
    wsRef.current = new WebSocket(SIGNALING_SERVER_URL);

    wsRef.current.onopen = () => {
      setStatus('✅ Connected to signaling server');
      if (joinRequestedRef.current) {
        sendSignal('join', { language });
        joinRequestedRef.current = false;
        setStatus('🔎 Looking for a partner...');
      }
    };

    wsRef.current.onmessage = async (message) => {
      const { type, data } = JSON.parse(message.data);
      setStatus(`📡 Signal received: ${type}`);

      if (type === 'match') {
        const isCaller = data.isCaller;
        startPeerConnection(isCaller);
      }

      if (type === 'offer') {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        sendSignal('answer', answer);
      }

      if (type === 'answer') {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
      }

      if (type === 'candidate') {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data));
        } catch (e) {
          console.error('Failed to add ICE candidate', e);
        }
      }

      if (type === 'leave') {
        endCall();
      }
    };
  }, [language]);

  const sendSignal = (type, data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket not open. Cannot send:', type);
    }
  };

  const joinQueue = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendSignal('join', { language });
      setStatus('🔎 Looking for a partner...');
    } else {
      joinRequestedRef.current = true;
      setStatus('⏳ Waiting for WebSocket connection...');
    }
  };

  const startPeerConnection = async (isInitiator) => {
    pcRef.current = new RTCPeerConnection();
    localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current.getTracks().forEach(track => pcRef.current.addTrack(track, localStreamRef.current));
    pcRef.current.ontrack = event => {
      remoteAudioRef.current.srcObject = event.streams[0];
      remoteAudioRef.current.play();
      setStatus('🔊 Remote audio stream connected!');
      setInCall(true);
    };
    pcRef.current.onicecandidate = e => {
      if (e.candidate) sendSignal('candidate', e.candidate);
    };

    if (isInitiator) {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      sendSignal('offer', offer);
      setStatus('📤 Creating offer...');
    } else {
      setStatus('📡 Waiting for offer...');
    }
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMuted(!audioTrack.enabled);
    }
  };

  const endCall = () => {
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current = null;
    setInCall(false);
    setStatus('👋 Call ended');
    sendSignal('leave');
  };

  return (
    <div className="container">
      <h2>🎙️ Voxa - Talk to Someone Random</h2>
      {!inCall && (
        <>
          <select value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
            <option value="arabic">Arabic</option>
          </select>
          <button onClick={joinQueue}>Start Talking</button>
        </>
      )}
      {inCall && (
        <>
          <button onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
          <button onClick={endCall}>End Call</button>
        </>
      )}
      <p>Status: {status}</p>
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}
