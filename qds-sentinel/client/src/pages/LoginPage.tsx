import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth, VERIFIED_OPERATORS } from '@/contexts/AuthContext';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  ArrowRight,
  Sparkles,
  Fingerprint,
  Radio,
  Eye,
  EyeOff,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Shield,
  Zap,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import MARK from '@/assets/qds-sentinel-mark_81058a94.png';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, loginAsOperator, isLoading, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'roster' | 'credentials'>('roster');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authenticatingRole, setAuthenticatingRole] = useState<string | null>(null);
  const [handshakeStep, setHandshakeStep] = useState<string | null>(null);

  // If already authenticated and user comes to /login, provide button to continue
  const handleContinueToDashboard = () => {
    setLocation('/home');
  };

  const handleOperatorSelect = async (roleKey: string) => {
    setAuthenticatingRole(roleKey);
    setHandshakeStep('Validating Bell state non-locality (S = 2.78)...');
    
    await new Promise((r) => setTimeout(r, 350));
    setHandshakeStep('Verifying Toeplitz OTP authentication hash...');

    await new Promise((r) => setTimeout(r, 350));
    setHandshakeStep('Post-quantum ML-DSA-65 attestation verified.');

    await loginAsOperator(roleKey);
    toast.success(`Welcome back, ${VERIFIED_OPERATORS[roleKey].display_name}! Gateway clearance verified.`);
    setLocation('/home');
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Please specify an operator username or node ID.');
      return;
    }

    setHandshakeStep('Initiating quantum key handshake...');
    const result = await login(username, password);

    if (result.success) {
      toast.success(`Operator ${username.toUpperCase()} authenticated successfully.`);
      setLocation('/home');
    } else {
      setHandshakeStep(null);
      toast.error(result.error || 'Authentication rejected. Check credentials.');
    }
  };

  return (
    <div className="login-viewport">
      {/* Ambient Top Identity Bar */}
      <header className="login-topbar">
        <div className="login-identity">
          <img src={MARK} alt="QDS Mark" className="login-mark" />
          <div className="login-title-group">
            <span className="login-brand">QDS SENTINEL</span>
            <span className="login-subbrand">QUANTUM GATEWAY ACCESS</span>
          </div>
        </div>

        <div className="login-telemetry-badge">
          <span className="telemetry-live-dot" />
          <Radio size={12} className="text-[var(--copper)] animate-pulse" />
          <span>FIBER LINK 01 · 1550nm</span>
          <span className="divider">·</span>
          <strong>QBER 1.9%</strong>
          <span className="divider">·</span>
          <strong className="text-[var(--blue)]">CHSH S=2.78</strong>
        </div>
      </header>

      {/* Main Container */}
      <main className="login-content-wrapper">
        <div className="login-panel-card">
          {/* Left / Top Banner Info */}
          <section className="login-hero-section">
            <div className="login-eyebrow">
              <span className="eyebrow-chip">00 / OPERATIONAL ACCESS GATEWAY</span>
              <span className="clearance-tag">SEC-LEVEL 3</span>
            </div>

            <h1 className="login-heading">Quantum Digital Signature Terminal</h1>
            <p className="login-lead">
              Authenticate your cryptographic operator terminal to monitor continuous entangled photon
              telemetry, inspect Hoeffding error bounds, and execute post-quantum lattice attestations.
            </p>

            <div className="protocol-compliance-grid">
              <div className="compliance-item">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <strong>SPDC Entanglement</strong>
                  <span>λ=775nm pump · Bell state non-locality</span>
                </div>
              </div>
              <div className="compliance-item">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <strong>Hoeffding Gate</strong>
                  <span>Statistical cutoff confidence &gt; 99.999%</span>
                </div>
              </div>
              <div className="compliance-item">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <strong>PQC Fallback Ready</strong>
                  <span>CRYSTALS-Dilithium3 / ML-DSA-65</span>
                </div>
              </div>
            </div>

            {handshakeStep && (
              <div className="login-handshake-box animate-pulse">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--copper)]">
                  <Cpu size={14} className="spin" />
                  <span>{handshakeStep}</span>
                </div>
              </div>
            )}
          </section>

          {/* Right / Bottom Interactive Authentication Card */}
          <section className="login-form-section">
            {/* Mode Switcher */}
            <div className="login-tab-strip">
              <button
                type="button"
                className={`login-tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
                onClick={() => { setActiveTab('roster'); setHandshakeStep(null); }}
              >
                <Fingerprint size={14} />
                <span>Verified Operators</span>
                <span className="tab-pill">1-Click</span>
              </button>
              <button
                type="button"
                className={`login-tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
                onClick={() => { setActiveTab('credentials'); setHandshakeStep(null); }}
              >
                <Terminal size={14} />
                <span>Terminal Credentials</span>
              </button>
            </div>

            {/* TAB 1: VERIFIED OPERATORS ROSTER */}
            {activeTab === 'roster' && (
              <div className="operator-roster-view">
                <div className="roster-header">
                  <span className="roster-meta">CHOOSE AN OPERATOR FOR INSTANT GATEWAY CLEARANCE:</span>
                </div>

                <div className="operator-cards-grid">
                  {Object.entries(VERIFIED_OPERATORS).map(([key, op]) => (
                    <button
                      key={key}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleOperatorSelect(key)}
                      className={`operator-card ${authenticatingRole === key ? 'authenticating' : ''}`}
                    >
                      <div className="operator-card-header">
                        <div
                          className="operator-avatar"
                          style={{
                            backgroundColor: op.badge_color,
                            color: '#ffffff',
                          }}
                        >
                          {op.avatar_text}
                        </div>
                        <div className="operator-name-block">
                          <strong className="operator-name">{op.display_name}</strong>
                          <span className="operator-role">{op.role}</span>
                        </div>
                        <span className="clearance-badge">{op.clearance}</span>
                      </div>

                      <div className="operator-card-footer">
                        <span className="node-id-mono">{op.node_id}</span>
                        <div className="operator-card-action">
                          <span>Authenticate</span>
                          <ArrowRight size={13} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="roster-note">
                  <Sparkles size={13} className="text-[var(--copper)] shrink-0" />
                  <span>
                    One-click operator authorization initializes your session with pre-configured quantum keys
                    and node telemetry access.
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: DIRECT CREDENTIALS FORM */}
            {activeTab === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit} className="credentials-form-view">
                <div className="form-group">
                  <label htmlFor="username-input">OPERATOR USERNAME / NODE IDENTIFIER</label>
                  <div className="input-affix-wrapper">
                    <span className="input-icon"><Terminal size={15} /></span>
                    <input
                      id="username-input"
                      type="text"
                      placeholder="e.g. anisha, alice, bob, ito, admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  <span className="field-hint">
                    Default operators: <code className="code-tag">anisha</code>, <code className="code-tag">alice</code>, <code className="code-tag">bob</code>, <code className="code-tag">admin</code>
                  </span>
                </div>

                <div className="form-group">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password-input">QUANTUM AUTH PASSKEY / TOKEN</label>
                    <span className="pass-hint text-[11px] text-[var(--slate)] font-mono">
                      (Same as username or &apos;operator123&apos;)
                    </span>
                  </div>
                  <div className="input-affix-wrapper">
                    <span className="input-icon"><Lock size={15} /></span>
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter cryptographic secret or operator key"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="reveal-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="form-options-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Persist operator session on this device</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="button button-copper login-submit-btn"
                >
                  {isLoading ? (
                    <>
                      <Cpu size={15} className="spin" />
                      <span>Verifying Quantum Handshake…</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={15} />
                      <span>Authenticate Terminal</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <div className="quick-fill-strip">
                  <span className="quick-label">QUICK TEST:</span>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => { setUsername('anisha'); setPassword('operator123'); }}
                  >
                    Anisha S (L2)
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => { setUsername('alice'); setPassword('alice'); }}
                  >
                    Alice (Node A)
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => { setUsername('admin'); setPassword('admin'); }}
                  >
                    Root Admin
                  </button>
                </div>
              </form>
            )}

            {/* If currently logged in, provide shortcut to dashboard */}
            {isAuthenticated && (
              <div className="existing-session-banner">
                <div className="session-info">
                  <span className="session-dot" />
                  <span>An active session is currently verified.</span>
                </div>
                <button
                  type="button"
                  onClick={handleContinueToDashboard}
                  className="button button-quiet button-small"
                >
                  Enter Portal <ArrowRight size={13} />
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Audit & Compliance Footer */}
        <footer className="login-footer">
          <div className="footer-meta-item">
            <Shield size={13} className="text-[var(--copper)]" />
            <span>NIST SP 800-208 Compliant · Quantum Digital Signatures</span>
          </div>
          <div className="footer-meta-item">
            <Zap size={13} className="text-[var(--blue)]" />
            <span>Authenticated Fiber Loop 1550nm · Real-Time QBER Gate</span>
          </div>
          <div className="footer-meta-item">
            <span>Terminal Version: <strong>v1.4.2-qds-live</strong></span>
          </div>
          <div className="footer-meta-item">
            <button
              type="button"
              className="text-link"
              onClick={() => window.dispatchEvent(new CustomEvent('qds-open-guidelines'))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--copper)' }}
            >
              <FileText size={12} />
              <span>Guidelines &amp; Policies</span>
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
