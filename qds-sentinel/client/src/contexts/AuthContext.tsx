import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  username: string;
  display_name: string;
  role: string;
  clearance: 'L1 OPERATOR' | 'L2 ANALYST' | 'L3 CRYPTANALYST' | 'ROOT ADMIN';
  node_id: string;
  avatar_text: string;
  avatar_bg?: string;
  is_admin: boolean;
  session_token?: string;
  login_time?: string;
  channel_affinity?: string;
}

export const VERIFIED_OPERATORS: Record<string, AuthUser & { default_pass: string; badge_color: string }> = {
  anisha: {
    username: 'anisha',
    default_pass: 'operator123',
    display_name: 'Anisha S',
    role: 'Security Operator & L2 Triage',
    clearance: 'L2 ANALYST',
    node_id: '#91F4-SOC',
    avatar_text: 'AS',
    avatar_bg: 'bg-[#b94a2f]',
    badge_color: 'var(--copper)',
    is_admin: false,
    channel_affinity: 'Dark Fiber Loop 01 · 1550nm',
  },
  alice: {
    username: 'alice',
    default_pass: 'alice',
    display_name: 'Alice Kovacs',
    role: 'Signer Node Alpha Lead',
    clearance: 'L3 CRYPTANALYST',
    node_id: '#9042-ALICE',
    avatar_text: 'AK',
    avatar_bg: 'bg-[#2f6f85]',
    badge_color: 'var(--blue)',
    is_admin: false,
    channel_affinity: 'SPDC Crystal A · λ 775nm',
  },
  bob: {
    username: 'bob',
    default_pass: 'bob',
    display_name: 'Bob Vance',
    role: 'Receiver Node Beta Lead',
    clearance: 'L2 ANALYST',
    node_id: '#260827-BOB',
    avatar_text: 'BV',
    avatar_bg: 'bg-[#3b6b55]',
    badge_color: '#3b6b55',
    is_admin: false,
    channel_affinity: 'Single Photon Detector D1/D2',
  },
  ito: {
    username: 'ito',
    default_pass: 'ito',
    display_name: 'Dr. M. Ito',
    role: 'Principal Cryptanalyst',
    clearance: 'L3 CRYPTANALYST',
    node_id: '#0077-ITO',
    avatar_text: 'MI',
    avatar_bg: 'bg-[#53406e]',
    badge_color: '#53406e',
    is_admin: false,
    channel_affinity: 'Forensic Quantum Tomography Core',
  },
  admin: {
    username: 'admin',
    default_pass: 'admin',
    display_name: 'Security Administrator',
    role: 'Chief Quantum Security Officer',
    clearance: 'ROOT ADMIN',
    node_id: '#000001-ROOT',
    avatar_text: 'AD',
    avatar_bg: 'bg-[#1e2329]',
    badge_color: '#1e2329',
    is_admin: true,
    channel_affinity: 'All Optical Grid Subsystems',
  },
};

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsOperator: (operatorKey: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('qds_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.username) {
          return parsed;
        }
      }
    } catch {}
    // Default to Anisha S for convenient initial session if not explicitly logged out
    const loggedOutExplicitly = localStorage.getItem('qds_logged_out') === 'true';
    if (!loggedOutExplicitly) {
      return VERIFIED_OPERATORS.anisha;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('qds_auth_user', JSON.stringify(user));
        localStorage.removeItem('qds_logged_out');
      } catch {}
    } else {
      try {
        localStorage.removeItem('qds_auth_user');
      } catch {}
    }
  }, [user]);

  const login = async (username: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanUsername = username.trim().toLowerCase();

    // 1. Check verified local operator profiles first
    const operator = VERIFIED_OPERATORS[cleanUsername];
    if (operator) {
      if (password && password !== operator.default_pass && password !== 'qds' && password !== 'admin') {
        setIsLoading(false);
        return { success: false, error: 'Invalid quantum authentication token/passcode.' };
      }

      const authenticatedUser: AuthUser = {
        ...operator,
        login_time: new Date().toLocaleTimeString('en-GB', { hour12: false }) + ' UTC',
        session_token: `QDS-SEC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      };

      setUser(authenticatedUser);
      setIsLoading(false);
      return { success: true };
    }

    // 2. Try FastAPI backend auth endpoint if online
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: password || cleanUsername }),
      });

      if (res.ok) {
        const data = await res.json();
        const apiUser: AuthUser = {
          username: data.user?.username || cleanUsername,
          display_name: data.user?.display_name || cleanUsername.toUpperCase(),
          role: data.user?.role || 'Verified Node Operator',
          clearance: data.user?.is_admin ? 'ROOT ADMIN' : 'L2 ANALYST',
          node_id: data.user?.node_id || `#${Math.floor(100000 + Math.random() * 900000)}`,
          avatar_text: data.user?.avatar_text || cleanUsername.slice(0, 2).toUpperCase(),
          is_admin: Boolean(data.user?.is_admin),
          login_time: new Date().toLocaleTimeString('en-GB', { hour12: false }) + ' UTC',
          session_token: data.access_token || `QDS-SEC-${Date.now().toString(36).toUpperCase()}`,
        };

        setUser(apiUser);
        setIsLoading(false);
        return { success: true };
      }
    } catch {
      // Backend offline / static GitHub Pages mode
    }

    // 3. Fallback for custom operator names in client demo mode
    if (cleanUsername.length >= 3) {
      const customUser: AuthUser = {
        username: cleanUsername,
        display_name: username.charAt(0).toUpperCase() + username.slice(1),
        role: 'Field Cryptanalyst',
        clearance: 'L1 OPERATOR',
        node_id: `#QDS-${Math.floor(1000 + Math.random() * 9000)}`,
        avatar_text: cleanUsername.slice(0, 2).toUpperCase(),
        is_admin: false,
        login_time: new Date().toLocaleTimeString('en-GB', { hour12: false }) + ' UTC',
        session_token: `QDS-SEC-${Date.now().toString(36).toUpperCase()}`,
        channel_affinity: 'Standard Optical Path · 1550nm',
      };

      setUser(customUser);
      setIsLoading(false);
      return { success: true };
    }

    setIsLoading(false);
    return { success: false, error: 'Username must be at least 3 characters.' };
  };

  const loginAsOperator = async (operatorKey: string): Promise<void> => {
    setIsLoading(true);
    // Simulate brief quantum handshake delay
    await new Promise((r) => setTimeout(r, 400));
    const operator = VERIFIED_OPERATORS[operatorKey] || VERIFIED_OPERATORS.anisha;
    const authenticatedUser: AuthUser = {
      ...operator,
      login_time: new Date().toLocaleTimeString('en-GB', { hour12: false }) + ' UTC',
      session_token: `QDS-SEC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    };
    setUser(authenticatedUser);
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('qds_auth_user');
      localStorage.setItem('qds_logged_out', 'true');
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAsOperator,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
