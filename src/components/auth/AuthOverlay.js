'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const styles = {
  overlay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    background: 'linear-gradient(145deg, #0a0e1a 0%, #0f172a 50%, #0a0e1a 100%)',
    backgroundImage: 'linear-gradient(145deg, #0a0e1a 0%, #0f172a 50%, #0a0e1a 100%), radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.03) 0%, transparent 50%)',
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: 400,
    width: '100%',
    padding: '48px 32px',
  },
  logoWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  logoGlow: {
    position: 'absolute',
    inset: '-40px',
    background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, rgba(59,130,246,0.08) 40%, transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
    filter: 'blur(8px)',
  },
  logo: {
    fontFamily: "'Fraunces', serif",
    fontSize: 40,
    fontWeight: 700,
    color: '#f1f5f9',
    position: 'relative',
    zIndex: 1,
    margin: 0,
  },
  logoDot: {
    color: '#6366f1',
    fontWeight: 400,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 500,
    marginBottom: 4,
    letterSpacing: '0.02em',
  },
  tagline: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    marginBottom: 32,
  },
  inputWrap: {
    width: '100%',
    animation: 'authSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 14,
    fontFamily: "'JetBrains Mono', monospace",
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    color: '#e2e8f0',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '14px 0',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    marginTop: 12,
    transition: 'opacity 0.2s, transform 0.15s, box-shadow 0.2s',
    letterSpacing: '0.01em',
    boxShadow: '0 2px 8px rgba(99,102,241,.2)',
  },
  helperText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 10,
  },
  errorMsg: {
    fontSize: 12,
    color: '#f87171',
    marginTop: 10,
    fontWeight: 500,
  },
  footer: {
    fontSize: 11,
    color: '#334155',
    marginTop: 40,
    letterSpacing: '0.04em',
  },
  // Sent state
  sentWrap: {
    marginTop: 8,
    animation: 'authSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'rgba(34,197,94,0.1)',
    border: '2px solid rgba(34,197,94,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    animation: 'authCheckPop 0.5s cubic-bezier(0.16,1,0.3,1) both 0.1s',
  },
  checkSvg: {
    width: 28,
    height: 28,
    color: '#22c55e',
  },
  sentTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 6,
  },
  sentDesc: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.7,
  },
  sentEmail: {
    color: '#93c5fd',
    fontWeight: 600,
  },
  resetLink: {
    color: '#475569',
    fontSize: 12,
    cursor: 'pointer',
    textDecoration: 'underline',
    marginTop: 20,
    display: 'inline-block',
    background: 'none',
    border: 'none',
    fontFamily: 'inherit',
    transition: 'color 0.2s',
  },
};

const keyframes = `
@keyframes authSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes authCheckPop {
  0% { opacity: 0; transform: scale(0.5); }
  60% { transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes authCheckDraw {
  to { stroke-dashoffset: 0; }
}
`;

export default function AuthOverlay() {
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email || !email.includes('@')) {
      setMsg('Please enter a valid email.');
      setMsgType('error');
      return;
    }
    setSending(true);
    setMsg('');
    try {
      await sendMagicLink(email);
      setSent(true);
    } catch (e) {
      setMsg(e.message || 'Failed to send link.');
      setMsgType('error');
      setSending(false);
    }
  }

  return (
    <>
      <style>{keyframes}</style>
      <div style={styles.overlay}>
        <div style={styles.card}>
          <div style={styles.logoWrap}>
            <div style={styles.logoGlow} />
            <h1 style={styles.logo}>
              Runway<span style={styles.logoDot}>.fyi</span>
            </h1>
          </div>
          <div style={styles.subtitle}>Financial Modeling for Startups</div>
          <div style={styles.tagline}>Know your runway before it runs out.</div>

          {!sent ? (
            <div style={styles.inputWrap}>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                style={styles.input}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(99,102,241,0.4)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  ...styles.button,
                  opacity: sending ? 0.7 : 1,
                  cursor: sending ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!sending) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 16px rgba(99,102,241,.35)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(99,102,241,.2)';
                }}
              >
                {sending ? 'Sending...' : 'Send Magic Link'}
              </button>
              <div style={styles.helperText}>No password needed</div>
              {msg && <div style={styles.errorMsg}>{msg}</div>}
            </div>
          ) : (
            <div style={styles.sentWrap}>
              <div style={styles.checkCircle}>
                <svg
                  style={styles.checkSvg}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    style={{
                      strokeDasharray: 24,
                      strokeDashoffset: 24,
                      animation: 'authCheckDraw 0.4s ease forwards 0.4s',
                    }}
                  />
                </svg>
              </div>
              <div style={styles.sentTitle}>Check your inbox</div>
              <div style={styles.sentDesc}>
                We sent a login link to{' '}
                <span style={styles.sentEmail}>{email}</span>.
                <br />
                Click it to sign in — no password needed.
              </div>
              <button
                style={styles.resetLink}
                onClick={() => {
                  setSent(false);
                  setSending(false);
                  setEmail('');
                }}
                onMouseEnter={(e) => (e.target.style.color = '#94a3b8')}
                onMouseLeave={(e) => (e.target.style.color = '#475569')}
              >
                Use a different email
              </button>
            </div>
          )}

          <div style={styles.footer}>
            Free forever &middot; No credit card required
          </div>
        </div>
      </div>
    </>
  );
}
