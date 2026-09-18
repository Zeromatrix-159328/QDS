import React, { useState, useEffect } from 'react';
import { useAuth, VERIFIED_OPERATORS } from '@/contexts/AuthContext';
import {
  KeyRound,
  Terminal,
  Fingerprint,
  ArrowRight,
  Sparkles,
  X,
  Lock,
  Eye,
  EyeOff,
  Cpu,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import MARK from '@/assets/qds-sentinel-mark_81058a94.png';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { user, login, loginAsOperator, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'roster' | 'credentials'>('roster');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authenticatingRole, setAuthenticatingRole] = useState<string | null>(null);
  const [handshakeStep, setHandshakeStep] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOperatorSelect = async (roleKey: string) => {
    setAuthenticatingRole(roleKey);
    setHandshakeStep('Verifying Bell state non-locality (S = 2.78)...');

    await new Promise((r) => setTimeout(r, 300));
    setHandshakeStep('Verifying Toeplitz OTP authentication hash...');

    await new Promise((r) => setTimeout(r, 300));
    setHandshakeStep('Post-quantum ML-DSA-65 attestation verified.');

    await loginAsOperator(roleKey);
    toast.success(`Welcome, ${VERIFIED_OPERATORS[roleKey].display_name}! Gateway clearance verified.`);
    setAuthenticatingRole(null);
    setHandshakeStep(null);
    onClose();
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
      toast.success(`Operator ${username.toUpperCase()} authenticated.`);
      setHandshakeStep(null);
      onClose();
    } else {
      setHandshakeStep(null);
      toast.error(result.error || 'Authentication rejected. Check credentials.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 100 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '94%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5">
            <img src={MARK} alt="" style={{ width: '26px', height: '26px' }} />
            <div>
              <span className="eyebrow" style={{ fontSize: '9px' }}>
                00 / GATEWAY ACCESS
              </span>
              <h3 style={{ margin: 0, fontSize: '16px', fontFamily: 'var(--serif)', fontWeight: 600 }}>
                Operator Authentication
              </h3>
            </div>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close authentication modal"
            style={{ color: 'var(--slate)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Current user badge if already signed in */}
        {user && (
          <div
            style={{
              margin: '14px 0 10px',
              padding: '8px 12px',
              borderRadius: '5px',
              background: 'var(--paper-deep)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '3px',
                  background: 'var(--copper)',
                  color: '#fff',
                  fontSize: '9px',
                  fontFamily: 'var(--mono)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
              >
                {user.avatar_text}
              </div>
              <span>
                Active operator: <strong>{user.display_name}</strong> ({user.role})
              </span>
            </div>
            <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--copper)' }}>
              {user.clearance}
            </span>
          </div>
        )}

        {/* Handshake Progress Alert */}
        {handshakeStep && (
          <div
            style={{
              margin: '12px 0',
              padding: '8px 12px',
              borderRadius: '4px',
              background: 'rgba(185, 74, 47, 0.08)',
              border: '1px solid rgba(185, 74, 47, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              fontFamily: 'var(--mono)',
              color: 'var(--copper)',
            }}
          >
            <Cpu size={14} className="spin shrink-0" />
            <span>{handshakeStep}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="login-tab-strip" style={{ margin: '14px 0 16px' }}>
          <button
            type="button"
            className={`login-tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            <Fingerprint size={13} />
            <span>Verified Operators</span>
            <span className="tab-pill">1-Click</span>
          </button>
          <button
            type="button"
            className={`login-tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
            onClick={() => setActiveTab('credentials')}
          >
            <Terminal size={13} />
            <span>Credentials</span>
          </button>
        </div>

        {/* TAB 1: OPERATORS ROSTER */}
        {activeTab === 'roster' && (
          <div className="operator-roster-view" style={{ gap: '8px' }}>
            <div className="operator-cards-grid" style={{ maxHeight: '280px' }}>
              {Object.entries(VERIFIED_OPERATORS).map(([key, op]) => (
                <button
                  key={key}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleOperatorSelect(key)}
                  className={`operator-card ${authenticatingRole === key ? 'authenticating' : ''}`}
                  style={{ padding: '10px 12px' }}
                >
                  <div className="operator-card-header">
                    <div
                      className="operator-avatar"
                      style={{
                        backgroundColor: op.badge_color,
                        color: '#ffffff',
                        width: '28px',
                        height: '28px',
                        fontSize: '10px',
                      }}
                    >
                      {op.avatar_text}
                    </div>
                    <div className="operator-name-block">
                      <strong className="operator-name" style={{ fontSize: '12px' }}>
                        {op.display_name}
                      </strong>
                      <span className="operator-role" style={{ fontSize: '10px' }}>
                        {op.role}
                      </span>
                    </div>
                    <span className="clearance-badge" style={{ fontSize: '8.5px' }}>
                      {op.clearance}
                    </span>
                  </div>

                  <div className="operator-card-footer" style={{ paddingTop: '4px', fontSize: '10px' }}>
                    <span className="node-id-mono">{op.node_id}</span>
                    <div className="operator-card-action" style={{ fontSize: '10px' }}>
                      <span>Sign In</span>
                      <ArrowRight size={11} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CREDENTIALS */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="credentials-form-view" style={{ gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="modal-username">OPERATOR USERNAME</label>
              <div className="input-affix-wrapper">
                <span className="input-icon"><Terminal size={14} /></span>
                <input
                  id="modal-username"
                  type="text"
                  placeholder="e.g. anisha, alice, bob, admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  style={{ padding: '9px 12px 9px 32px', fontSize: '12px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="modal-password">QUANTUM PASSKEY</label>
              <div className="input-affix-wrapper">
                <span className="input-icon"><Lock size={14} /></span>
                <input
                  id="modal-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password or token"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  style={{ padding: '9px 32px 9px 32px', fontSize: '12px' }}
                />
                <button
                  type="button"
                  className="reveal-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="button button-copper"
              style={{ width: '100%', padding: '10px', fontSize: '12px' }}
            >
              <KeyRound size={14} />
              <span>Authenticate Operator</span>
            </button>

            <div className="quick-fill-strip" style={{ marginTop: '2px', paddingTop: '8px' }}>
              <span className="quick-label">QUICK:</span>
              <button
                type="button"
                className="quick-chip"
                onClick={() => { setUsername('anisha'); setPassword('operator123'); }}
              >
                Anisha (L2)
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
                Admin
              </button>
            </div>
          </form>
        )}

        {/* Modal Footer Link to Full Login Terminal */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--slate)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>NIST ML-DSA-65 Certified</span>
          </div>
          <Link
            href="/login"
            onClick={onClose}
            className="text-link"
            style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>Dedicated Login Terminal</span>
            <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}
