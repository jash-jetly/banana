import { useState } from 'react';
import { usePeerClient } from '../hooks/usePeer';

export default function ClientView({ initialCode }) {
  const [code, setCode] = useState(initialCode || '');
  const { status, error, startShare, stopShare } = usePeerClient();

  const isSharing = status === 'connected';
  const isConnecting = status === 'requesting' || status === 'connecting';

  const handleStart = () => {
    const c = code.trim().toUpperCase();
    startShare(c);
  };

  const statusText = {
    idle: 'Tap to share screen',
    requesting: 'Requesting screen access…',
    connecting: 'Connecting to laptop…',
    connected: '✅ Sharing live — laptop connected!',
    error: error ? `❌ ${error}` : '❌ Connection error',
  };

  return (
    <div className="client-layout">
      <div className="logo" style={{ fontSize: '28px', marginBottom: '6px' }}>
        Screen<span className="dot">.</span>Cast
      </div>
      <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '36px' }}>
        Share your phone screen to your laptop
      </div>

      <div className="client-card">
        {/* Code Input */}
        {!initialCode ? (
          <div style={{ marginBottom: '24px' }}>
            <div className="label" style={{ textAlign: 'left' }}>Enter Code from Laptop</div>
            <input
              type="text"
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="XXXX"
              maxLength={4}
              style={{
                textAlign: 'center',
                fontSize: '32px',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'var(--accent)',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div className="label" style={{ textAlign: 'left' }}>Connect Code</div>
            <div className="code-number">{initialCode}</div>
          </div>
        )}

        {/* Share Button */}
        <div className="share-btn-wrap">
          <div
            className={`share-btn ${isSharing ? 'active' : ''}`}
            onClick={isConnecting ? undefined : (isSharing ? stopShare : handleStart)}
            style={isConnecting ? { opacity: 0.6, cursor: 'wait' } : undefined}
          >
            {isConnecting ? '⏳' : isSharing ? '🟢' : '📱'}
          </div>
          <div className={`share-status ${isSharing ? 'ok' : ''}`} style={error ? { color: 'var(--red)' } : undefined}>
            {statusText[status] || 'Tap to share screen'}
          </div>
          {isSharing && (
            <button className="btn btn-red" onClick={stopShare}>
              ⏹ Stop Sharing
            </button>
          )}
        </div>

        <div className="divider"></div>

        <div style={{ fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.8, textAlign: 'left' }}>
          <strong style={{ color: 'var(--text)' }}>How to use:</strong><br />
          1. Open this page in <strong style={{ color: 'var(--accent)' }}>Chrome on Android</strong><br />
          2. Enter the 4-char code from your laptop<br />
          3. Tap the button & select "Entire screen"<br />
          4. Your screen streams live to the laptop!
        </div>
      </div>

      <div style={{ marginTop: '24px', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.6, textAlign: 'center' }}>
        ✅ Works on Android Chrome &nbsp;·&nbsp; ⚠️ iOS not supported<br />
        <span style={{ fontSize: '10px', opacity: 0.6 }}>Peer-to-peer · no data leaves your network</span>
      </div>
    </div>
  );
}
