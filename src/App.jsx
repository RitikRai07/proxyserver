import { useState, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import './index.css'; // Make sure the styles are applied

function App() {
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle', 'pending', 'success', 'error'
  const [showTurnstile, setShowTurnstile] = useState(false);
  const turnstileRef = useRef(null);
  const [ipData, setIpData] = useState({ loading: false, ip: null, error: null });

  // Cloudflare Turnstile Client Key from environment
  const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || 'test_mode';
  const [turnstileError, setTurnstileError] = useState(null);

  const checkProxyIP = async () => {
    setIpData({ loading: true, ip: null, error: null });
    try {
      // /check-ip is routed through our proxy in vite.config.js to the backend on port 3001
      const res = await fetch('/check-ip');
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      if (data.ip) {
        setIpData({ loading: false, ip: data.ip, error: null });
      } else if (data.error) {
        setIpData({ loading: false, ip: null, error: data.error });
      } else {
        setIpData({ loading: false, ip: null, error: 'Unexpected response format' });
      }
    } catch (err) {
      setIpData({ loading: false, ip: null, error: err.message || 'Failed to fetch - Make sure backend is running on port 3001' });
    }
  };

  const handleVerify = () => {
    if (token) {
      // In a real app, you would send this token to your backend
      setStatus('success');
      console.log('Verified! Token:', token);
    } else {
      setShowTurnstile(true);
      setStatus('pending');
    }
  };

  const resetVerification = () => {
    setToken(null);
    setStatus('idle');
    setShowTurnstile(false);
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  };

  return (
    <div className="app-container">
      <div className="glass-card">
        <h1 className="title">Secure Verify</h1>
        <p className="subtitle">Protecting your app with modern bot detection.</p>
        
        <div className="status-container">
          {status === 'idle' && (
            <span className="status-badge status-idle">
              Ready to verify
            </span>
          )}
          {status === 'pending' && (
            <span className="status-badge status-pending">
              Awaiting verification...
            </span>
          )}
          {status === 'success' && (
            <span className="status-badge status-success">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Verification Successful
            </span>
          )}
        </div>

        {showTurnstile && status !== 'success' && (
          <div className="turnstile-wrapper">
            {SITE_KEY === 'test_mode' ? (
              <div style={{ 
                padding: '1.5rem', 
                background: 'rgba(255,165,0,0.1)', 
                border: '1px solid orange', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#ffa500', margin: '0 0 1rem 0' }}>
                  ⚠️ Turnstile not configured. Add VITE_TURNSTILE_SITE_KEY to .env
                </p>
                <button 
                  className="action-btn"
                  onClick={() => {
                    setToken('test_token_' + Date.now());
                    setStatus('success');
                  }}
                  style={{ padding: '0.8rem 1.5rem' }}
                >
                  Test Mode: Skip Verification
                </button>
              </div>
            ) : (
              <Turnstile
                ref={turnstileRef}
                siteKey={SITE_KEY}
                onSuccess={(t) => {
                  setToken(t);
                  setTurnstileError(null);
                  setStatus('success');
                }}
                onError={(err) => {
                  console.error('Turnstile Error:', err);
                  setTurnstileError('Verification failed. Check your proxy/firewall.');
                  setStatus('error');
                }}
                onExpire={() => {
                  setToken(null);
                  setStatus('idle');
                }}
                options={{
                  theme: 'dark',
                }}
              />
            )}
            {turnstileError && (
              <p style={{ color: '#ff6b6b', marginTop: '1rem', fontSize: '0.9rem' }}>
                ❌ {turnstileError}
              </p>
            )}
          </div>
        )}

        <div className="actions">
          {status !== 'success' ? (
            <button 
              className="action-btn"
              onClick={handleVerify}
              disabled={status === 'pending' && !token}
            >
              {showTurnstile ? 'Verifying...' : 'Show Verification'}
            </button>
          ) : (
            <button 
              className="action-btn"
              onClick={resetVerification}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="glass-card ip-card" style={{ padding: '2rem', marginTop: '1rem', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Proxy IP Checker</h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#a0a4b8' }}>
          Check if requests are correctly routing through your proxy.
        </p>
        
        {ipData.loading && <span className="status-badge status-pending">Checking...</span>}
        {ipData.error && (
          <div style={{ background: 'rgba(255, 107, 107, 0.1)', border: '1px solid #ff6b6b', borderRadius: '8px', padding: '1rem', color: '#ff6b6b', fontSize: '0.95rem' }}>
            <strong>❌ Error:</strong> {ipData.error}
          </div>
        )}
        {ipData.ip && (
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', fontSize: '1.2rem', fontFamily: 'monospace', color: '#2ed573' }}>
            {ipData.ip}
          </div>
        )}

        <button className="action-btn" onClick={checkProxyIP} style={{ padding: '0.8rem 1.5rem', fontSize: '1rem' }} disabled={ipData.loading}>
          {ipData.ip ? 'Re-check IP' : 'Check IP'}
        </button>
      </div>
    </div>
  );
}

export default App;
