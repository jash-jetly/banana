import { useState, useRef, useCallback, useEffect } from 'react';
import Peer from 'peerjs';

/**
 * ICE configuration with STUN + TURN servers for cross-network connectivity.
 */
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:a.relay.metered.ca:80',
      username: 'e8dd65b92f6dfe16a4e1d872',
      credential: 'uWdDpYSJCMlP/Fn8',
    },
    {
      urls: 'turn:a.relay.metered.ca:443',
      username: 'e8dd65b92f6dfe16a4e1d872',
      credential: 'uWdDpYSJCMlP/Fn8',
    },
    {
      urls: 'turn:a.relay.metered.ca:443?transport=tcp',
      username: 'e8dd65b92f6dfe16a4e1d872',
      credential: 'uWdDpYSJCMlP/Fn8',
    },
  ],
};

/**
 * Custom React hook for managing a PeerJS host connection.
 * Creates a peer that listens for incoming media calls and streams.
 */
export function usePeerHost(code) {
  const [status, setStatus] = useState('initializing');
  const [stream, setStream] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ resolution: '', fps: '', elapsed: 0 });

  const peerRef = useRef(null);
  const callRef = useRef(null);
  const startTimeRef = useRef(null);
  const elapsedTimerRef = useRef(null);

  const addLog = useCallback((msg, type = 'info') => {
    const ts = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs((prev) => [{ msg: `[${ts}] ${msg}`, type, id: Date.now() + Math.random() }, ...prev].slice(0, 50));
  }, []);

  // Initialize the host peer
  useEffect(() => {
    if (!code) return;

    const peerId = `screencast-${code}`;
    addLog(`Creating host peer: ${peerId}`, 'info');

    const peer = new Peer(peerId, {
      debug: 0,
      config: ICE_CONFIG,
    });

    peerRef.current = peer;

    peer.on('open', (id) => {
      setStatus('waiting');
      addLog(`✅ Host ready — peer ID: ${id}`, 'success');
    });

    peer.on('call', (call) => {
      addLog('📞 Incoming call from phone!', 'success');
      setStatus('connecting');

      // Answer the call — we don't send any stream back, we only receive
      call.answer();
      callRef.current = call;

      call.on('stream', (remoteStream) => {
        addLog('🟢 Stream received! Video is live.', 'success');
        setStatus('connected');
        setStream(remoteStream);
        startTimeRef.current = Date.now();

        // Get video track info
        const videoTrack = remoteStream.getVideoTracks()[0];
        if (videoTrack) {
          // Wait a moment for settings to populate
          setTimeout(() => {
            const settings = videoTrack.getSettings();
            setStats((prev) => ({
              ...prev,
              resolution: `${settings.width || '?'}×${settings.height || '?'}`,
              fps: `${settings.frameRate ? Math.round(settings.frameRate) : '?'}`,
            }));
            addLog(`📐 Resolution: ${settings.width}×${settings.height} @ ${Math.round(settings.frameRate || 0)}fps`, 'info');
          }, 1000);

          // Track ended handler
          videoTrack.onended = () => {
            addLog('⏹ Remote video track ended', 'warn');
            setStatus('disconnected');
            setStream(null);
            clearInterval(elapsedTimerRef.current);
          };
        }

        // Elapsed timer
        elapsedTimerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            setStats((prev) => ({
              ...prev,
              elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
            }));
          }
        }, 1000);
      });

      call.on('close', () => {
        addLog('🔴 Call closed', 'error');
        setStatus('disconnected');
        setStream(null);
        clearInterval(elapsedTimerRef.current);
      });

      call.on('error', (err) => {
        addLog(`❌ Call error: ${err.message || err}`, 'error');
      });
    });

    peer.on('connection', (conn) => {
      addLog(`📡 Data connection from: ${conn.peer}`, 'info');
      conn.on('open', () => {
        addLog('📡 Data channel open', 'info');
      });
    });

    peer.on('error', (err) => {
      addLog(`❌ Peer error: ${err.type} — ${err.message || err}`, 'error');
      if (err.type === 'unavailable-id') {
        addLog('⚠️ This code is already in use. Refresh to get a new one.', 'warn');
        setStatus('error');
      }
    });

    peer.on('disconnected', () => {
      addLog('⚠️ Disconnected from signaling server. Attempting reconnect...', 'warn');
      // Try to reconnect
      if (!peer.destroyed) {
        peer.reconnect();
      }
    });

    return () => {
      clearInterval(elapsedTimerRef.current);
      peer.destroy();
    };
  }, [code, addLog]);

  const disconnect = useCallback(() => {
    callRef.current?.close();
    setStream(null);
    setStatus('waiting');
    clearInterval(elapsedTimerRef.current);
    addLog('Disconnected by host', 'info');
  }, [addLog]);

  return { status, stream, logs, stats, addLog, disconnect };
}

/**
 * Custom React hook for managing a PeerJS client connection.
 * Initiates a call to a host peer with a local media stream.
 */
export function usePeerClient() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const peerRef = useRef(null);
  const streamRef = useRef(null);

  const startShare = useCallback(async (code) => {
    if (!code || code.length < 4) {
      setError('Enter the 4-char code first');
      return;
    }

    setStatus('requesting');
    setError(null);

    try {
      // Request screen share
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30, max: 30 },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setStatus('connecting');

      // Create peer and call the host
      const peer = new Peer({
        debug: 0,
        config: ICE_CONFIG,
      });

      peerRef.current = peer;

      peer.on('open', () => {
        const hostPeerId = `screencast-${code.toUpperCase()}`;
        const call = peer.call(hostPeerId, stream);

        if (!call) {
          setError('Failed to initiate call. Check the code.');
          setStatus('error');
          return;
        }

        call.on('error', (err) => {
          setError(err.message || 'Call failed');
          setStatus('error');
        });

        setStatus('connected');
      });

      peer.on('error', (err) => {
        setError(err.message || 'Connection error');
        setStatus('error');
      });

      // Handle track ended (user stopped sharing from system UI)
      stream.getVideoTracks()[0].onended = () => {
        stopShare();
      };
    } catch (e) {
      setError(e.message || 'Permission denied');
      setStatus('idle');
    }
  }, []);

  const stopShare = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, startShare, stopShare };
}
