import { useRef, useEffect, useState, useCallback } from 'react';
import { usePeerHost } from '../hooks/usePeer';

function randCode() {
  return Math.random().toString(36).substr(2, 4).toUpperCase();
}

function formatElapsed(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function HostView() {
  const [code] = useState(() => randCode());
  const [copied, setCopied] = useState(false);

  const videoRef = useRef(null);

  const { status, stream, stats, disconnect } = usePeerHost(code);

  const base = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';
  const clientUrl = `${base}?mode=client&code=${code}`;

  // Attach stream to video
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => { });
    }
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [stream]);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(clientUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = clientUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [clientUrl]);

  const isLive = status === 'connected';
  const isConnecting = status === 'connecting';

  const badgeConfig = {
    initializing: { cls: 'badge badge-gray', dot: 'gray', text: 'INITIALIZING' },
    waiting: { cls: 'badge badge-orange', dot: 'orange', text: 'WAITING' },
    connecting: { cls: 'badge badge-orange', dot: 'orange', text: 'CONNECTING' },
    connected: { cls: 'badge badge-green', dot: 'green', text: 'CONNECTED' },
    disconnected: { cls: 'badge badge-red', dot: 'red', text: 'DISCONNECTED' },
    error: { cls: 'badge badge-red', dot: 'red', text: 'ERROR' },
  };

  const badge = badgeConfig[status] || badgeConfig.waiting;

  return (
    <div className="host-layout">
      {/* ── Centered Phone ── */}
      <div className="phone-center">
        <div className={`phone-frame ${isLive ? 'live' : ''}`}>
          <div className="phone-notch"></div>
          <video ref={videoRef} autoPlay playsInline muted style={{ display: isLive ? 'block' : 'none' }} />

          {!isLive && (
            <div className="video-placeholder">
              <div className="placeholder-icon">📱</div>
              <div className="placeholder-title">
                {isConnecting ? 'Connecting…' : 'Waiting for phone…'}
              </div>
              <div className="placeholder-sub">
                {isConnecting ? 'Establishing WebRTC connection' : 'Enter the code on your phone app'}
              </div>
            </div>
          )}

          {isLive && (
            <div className="video-overlay">
              <div className="overlay-top">
                <span className="badge badge-green">
                  <span className="status-dot green"></span>&nbsp;LIVE
                </span>
                {stats.resolution && (
                  <span className="badge badge-gray" style={{ fontFamily: 'var(--font-mono)' }}>
                    {stats.resolution}
                  </span>
                )}
              </div>
              <div className="overlay-bottom">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' }}>
                  ⏱ {formatElapsed(stats.elapsed)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Connection info */}
        <div className="connection-info">
          <div className="code-mini">
            <span className="label">CODE</span>
            <span className="code-value">{code}</span>
          </div>
          <div className={badge.cls} style={{ fontSize: '10px' }}>
            <span className={`status-dot ${badge.dot}`}></span>&nbsp;{badge.text}
          </div>
        </div>

        <div className="code-url-mini" onClick={copyUrl} title="Click to copy URL">
          {copied ? '✅ Copied!' : '📋 Copy connect URL'}
        </div>

        {isLive && (
          <button className="btn btn-red" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }} onClick={disconnect}>
            ⏹ Disconnect
          </button>
        )}
      </div>

      {/* Copy toast */}
      <div className={`copy-toast ${copied ? 'show' : ''}`}>✅ URL copied to clipboard</div>
    </div>
  );
}
