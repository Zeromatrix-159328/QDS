import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { apiClient } from './apiClient';
import { toast } from 'sonner';

export interface TransmissionRecord {
  id: string;
  time: string;
  verification: string;
  title: string;
  body: string;
  signature: string;
  digest?: string;
  qber: string;
  chsh: string;
  pauli: string;
  tone: 'good' | 'pqc' | 'copper';
  metricTone: string;
}

export interface TelemetryItem {
  id: string;
  time: string;
  source: string;
  text: string;
  ms: string;
  code: string;
  qber: string;
  chsh: string;
  payloadContent?: string;
  isThreat?: boolean;
  createdAt?: number;
}

export function formatIstTime(dateOrMsOrStr?: Date | number | string, includeMs = true): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  if (!dateOrMsOrStr) {
    const d = new Date();
    const timeStr = formatter.format(d);
    if (!includeMs) return timeStr;
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${timeStr}.${ms}`;
  }

  if (typeof dateOrMsOrStr === 'string') {
    const trimmed = dateOrMsOrStr.trim();
    // If ALREADY formatted as HH:mm:ss or HH:mm:ss.SSS, return as-is without re-applying timezone
    if (/^\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(trimmed)) {
      const [timePart, msPart] = trimmed.split('.');
      if (!includeMs) return timePart;
      const ms = (msPart || '000').padEnd(3, '0').slice(0, 3);
      return `${timePart}.${ms}`;
    }

    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      const timeStr = formatter.format(d);
      if (!includeMs) return timeStr;
      const ms = String(d.getMilliseconds()).padStart(3, '0');
      return `${timeStr}.${ms}`;
    }
  }

  const d = typeof dateOrMsOrStr === 'number' ? new Date(dateOrMsOrStr) : dateOrMsOrStr instanceof Date ? dateOrMsOrStr : new Date();
  const timeStr = formatter.format(d);
  if (!includeMs) return timeStr;
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${timeStr}.${ms}`;
}

export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.replace(/[^0-9:\.]/g, '').trim();
  const parts = clean.split(':');
  if (parts.length < 3) return 0;
  const hours = parseFloat(parts[0]) || 0;
  const minutes = parseFloat(parts[1]) || 0;
  const seconds = parseFloat(parts[2]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

export function sortTelemetryDesc(items: TelemetryItem[]): TelemetryItem[] {
  const seen = new Set<string>();
  const uniqueItems: TelemetryItem[] = [];
  for (const it of items) {
    if (!it) continue;
    const key = it.id || `${it.time}-${it.source}-${it.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(it);
    }
  }
  return uniqueItems.sort((a, b) => {
    const cA = Number(a.createdAt) || 0;
    const cB = Number(b.createdAt) || 0;
    if (cA && cB && cA !== cB) return cB - cA;
    const tA = parseTimeToSeconds(a.time);
    const tB = parseTimeToSeconds(b.time);
    if (tA !== tB) return tB - tA;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

export interface IncidentItem {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED' | 'ESCALATED';
  assigned: string;
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  qber: string;
  chsh: string;
  timestamp: string;
  analyst: string;
  detail: string;
  events: [string, string, string][];
  helstrom: string;
  traceDistance: string;
  targetNode: string;
}

export interface ThreatAnomalyItem {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  origin: string;
  badge?: string;
  type: string;
  time: string;
  baseline: string;
  current: string;
  detail: string;
  qber: number;
  chsh: number;
}

export interface SessionStreamItem {
  id: string;
  endpoint: string;
  state: 'STABLE' | 'DEGRADED' | 'PAUSED' | 'QUARANTINED';
  rate: string;
  duration: string;
  trace: 'wave' | 'rise' | 'step' | 'wave-low';
  tone: 'good' | 'copper' | 'blue';
}

export interface QuantumNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  timeAgo?: string;
  createdAt?: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  category: 'security' | 'telemetry' | 'protocol' | 'attestation' | 'system';
  read: boolean;
  qber?: string;
  chsh?: string;
  sourceNode?: string;
  actionLabel?: string;
  actionRoute?: string;
  metadata?: Record<string, any>;
}

export interface QuantumThresholdProfile {
  attackTitle: string;
  code: string;
  sampleSize: number;       // N (number of photon pairs measured)
  alpha: number;            // Security parameter (e.g. 1e-9)
  delta: number;            // Hoeffding statistical bound sqrt(ln(2/alpha)/(2N))
  baselineQber: number;     // Expected physical channel baseline
  threshold: number;        // Dynamic Hoeffding cutoff threshold
  thresholdPercent: string; // e.g. "5.50%" or "4.10%" or "6.80%"
  chshBound: number;        // e.g. 2.00 (Tsirelson / Bell classical boundary)
  helstromPe?: string;      // Helstrom minimum discrimination error bound
  lossDb?: number;          // Optical fiber loss in dB
  rationale: string;        // Quantum physics explanation
}

export function calculateQuantumThreshold(attackTitle: string, customSampleSize?: number): QuantumThresholdProfile {
  if (attackTitle.includes("MitM")) {
    const N = customSampleSize || 1024;
    const alpha = 1e-9;
    const baseline = 0.020;
    const threshold = 0.0550;
    return {
      attackTitle,
      code: "MITM",
      sampleSize: N,
      alpha,
      delta: 0.0350,
      baselineQber: baseline,
      threshold,
      thresholdPercent: "5.50%",
      chshBound: 2.00,
      helstromPe: "P_e ≥ 0.0820",
      lossDb: 0.5,
      rationale: "Conjugate basis measurement (X/Z) collapses superposition states; requires strict 5.50% cutoff."
    };
  }
  if (attackTitle.includes("Forgery")) {
    const N = customSampleSize || 1024;
    const alpha = 1e-9;
    const baseline = 0.018;
    const threshold = 0.0520;
    return {
      attackTitle,
      code: "FORGE",
      sampleSize: N,
      alpha,
      delta: 0.0340,
      baselineQber: baseline,
      threshold,
      thresholdPercent: "5.20%",
      chshBound: 2.00,
      helstromPe: "P_e ≥ 0.0910",
      lossDb: 0.4,
      rationale: "Feed-forward BSM bit corruption; dual acceptance threshold s_a=5.20% enforced."
    };
  }
  if (attackTitle.includes("Replay")) {
    const N = customSampleSize || 1536;
    const alpha = 1e-9;
    const baseline = 0.020;
    const threshold = 0.0490;
    return {
      attackTitle,
      code: "REPLAY",
      sampleSize: N,
      alpha,
      delta: 0.0290,
      baselineQber: baseline,
      threshold,
      thresholdPercent: "4.90%",
      chshBound: 2.00,
      helstromPe: "P_e ≥ 0.1140",
      lossDb: 0.3,
      rationale: "Stale nonce replay over N=1536 pulses; tighter Hoeffding bound restricts cutoff to 4.90%."
    };
  }
  if (attackTitle.includes("PNS")) {
    const N = customSampleSize || 1024;
    const alpha = 1e-9;
    const baseline = 0.018;
    const threshold = 0.0410;
    return {
      attackTitle,
      code: "PNS",
      sampleSize: N,
      alpha,
      delta: 0.0230,
      baselineQber: baseline,
      threshold,
      thresholdPercent: "4.10%",
      chshBound: 2.00,
      helstromPe: "P_e ≥ 0.0750",
      lossDb: 4.5,
      rationale: "Multiphoton splitting probe; tolerable QBER bound lowered to 4.10% to account for channel loss."
    };
  }
  if (attackTitle.includes("Noise") || attackTitle.includes("Jamming")) {
    const N = customSampleSize || 1024;
    const alpha = 1e-6;
    const baseline = 0.020;
    const threshold = 0.0550;
    return {
      attackTitle: "Channel noise attack",
      code: "NOISE",
      sampleSize: N,
      alpha,
      delta: 0.0350,
      baselineQber: baseline,
      threshold,
      thresholdPercent: "5.50%",
      chshBound: 2.00,
      helstromPe: "P_e ≥ 0.0610",
      lossDb: 2.8,
      rationale: "Adversarial channel noise injection & optical jamming; QBER (10.80%) exceeds Hoeffding bound (5.50%) and Bell test S=1.74 (< 2.00) collapses non-locality."
    };
  }
  // Default Clean / Nominal
  const N = customSampleSize || 2048;
  const alpha = 1e-9;
  const baseline = 0.015;
  const threshold = 0.0550;
  return {
    attackTitle: "Clean signature",
    code: "CLEAN",
    sampleSize: N,
    alpha,
    delta: 0.0400,
    baselineQber: baseline,
    threshold,
    thresholdPercent: "5.50%",
    chshBound: 2.00,
    helstromPe: "P_e ≥ 0.5000",
    lossDb: 0.2,
    rationale: "Nominal SPDC entanglement distribution; calibrated baseline Hoeffding cutoff at 5.50%."
  };
}

export const getQuantumThresholdProfile = calculateQuantumThreshold;

export interface SentinelContextType {
  eveActive: boolean;
  activeSessionId: string;
  qber: number;
  chsh: number;
  pqcMode: boolean;
  remediationReport: string | null;
  payloads: TransmissionRecord[];
  telemetryLogs: TelemetryItem[];
  incidents: IncidentItem[];
  threats: ThreatAnomalyItem[];
  sessions: SessionStreamItem[];
  activeAttack: string;
  hoeffdingThreshold: number;
  thresholdProfile: QuantumThresholdProfile;
  notifications: QuantumNotification[];
  unreadNotificationCount: number;
  isNotificationCenterOpen: boolean;
  openNotificationCenter: () => void;
  closeNotificationCenter: () => void;
  toggleNotificationCenter: () => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;
  deleteNotification: (id: string) => void;
  addNotification: (notif: Omit<QuantumNotification, 'id' | 'timestamp' | 'read'> & { id?: string; timestamp?: string; read?: boolean }) => void;
  toggleEve: () => Promise<void>;
  triggerAttack: (attackTitle: string, customQber?: number, customChsh?: number) => Promise<void>;
  executeProtocolRun: (documentName?: string, isEveActive?: boolean) => Promise<any>;
  pushTelemetryLogs: (items: TelemetryItem[]) => void;
  sendTransmission: (payload: { mode: 'message' | 'document'; message?: string; file?: File | null; digest?: string | null }) => Promise<void>;
  resetChannel: () => void;
  resolveIncident: (id: string) => void;
  escalateIncident: (id: string) => void;
  quarantineNode: (nodeId: string) => void;
  clearTelemetryLogs: () => void;
}

const SentinelContext = createContext<SentinelContextType | undefined>(undefined);

const playQuantumChime = (severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS' = 'INFO') => {
  try {
    if (typeof window === 'undefined') return;
    const isMuted = localStorage.getItem('qds_notif_sound') === 'false';
    if (isMuted) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (severity === 'CRITICAL') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else if (severity === 'WARNING') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch {}
};

export const SentinelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAttack, setActiveAttack] = useState<string>(() => {
    try {
      const val = localStorage.getItem('qds_active_attack');
      if (val) return val;
    } catch { }
    return 'Clean signature';
  });
  const [eveActive, setEveActive] = useState<boolean>(() => {
    try {
      const atk = localStorage.getItem('qds_active_attack');
      if (atk && atk !== 'Clean signature') return true;
      return localStorage.getItem('qds_eve_active') === 'true';
    } catch {
      return false;
    }
  });
  const [activeSessionId, setActiveSessionId] = useState('QKD-260827-91F4');
  const [qber, setQber] = useState<number>(() => {
    try {
      const atk = localStorage.getItem('qds_active_attack');
      if (atk && atk !== 'Clean signature' && atk.toLowerCase().includes('noise')) return 0.108;
      const val = localStorage.getItem('qds_qber');
      if (val) return parseFloat(val);
    } catch { }
    return 0.019;
  });
  const [chsh, setChsh] = useState<number>(() => {
    try {
      const atk = localStorage.getItem('qds_active_attack');
      if (atk && atk !== 'Clean signature' && atk.toLowerCase().includes('noise')) return 1.74;
      const val = localStorage.getItem('qds_chsh');
      if (val) return parseFloat(val);
    } catch { }
    return 2.76;
  });
  const [pqcMode, setPqcMode] = useState<boolean>(() => {
    try {
      const atk = localStorage.getItem('qds_active_attack');
      if (atk && atk !== 'Clean signature') return true;
      return localStorage.getItem('qds_pqc_mode') === 'true';
    } catch { }
    return false;
  });
  const [remediationReport, setRemediationReport] = useState<string | null>(null);

  // Self-healing effect: ensure active attacks (like Channel noise) have breached error rates and PQC mode enabled
  useEffect(() => {
    if (activeAttack && activeAttack !== 'Clean signature') {
      if (activeAttack.toLowerCase().includes('noise') && (qber < 0.06 || chsh > 2.0)) {
        setQber(0.108);
        setChsh(1.74);
        setEveActive(true);
        setPqcMode(true);
        try {
          localStorage.setItem('qds_qber', '0.108');
          localStorage.setItem('qds_chsh', '1.74');
          localStorage.setItem('qds_eve_active', 'true');
          localStorage.setItem('qds_pqc_mode', 'true');
        } catch {}
      }
    }
  }, [activeAttack, qber, chsh]);

  const thresholdProfile = useMemo(() => {
    return calculateQuantumThreshold(activeAttack);
  }, [activeAttack]);
  const hoeffdingThreshold = thresholdProfile.threshold;

  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);

  const computeTimeAgo = (createdAt?: number, fallbackStr?: string): string => {
    if (!createdAt) return fallbackStr || 'Just now';
    const elapsed = Math.max(0, Date.now() - createdAt);
    const seconds = Math.floor(elapsed / 1000);
    if (seconds < 15) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const [notifications, setNotifications] = useState<QuantumNotification[]>(() => {
    try {
      const stored = localStorage.getItem('qds_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((n: QuantumNotification) => ({
            ...n,
            timeAgo: computeTimeAgo(n.createdAt, n.timeAgo)
          }));
        }
      }
    } catch {}
    const now = Date.now();
    const formatRelTime = (offsetMs: number) => {
      const d = new Date(now - offsetMs);
      const timeStr = d.toTimeString().split(' ')[0];
      return timeStr;
    };
    return [
      {
        id: 'notif-init-1',
        title: 'SPDC Entangled Photons Active',
        message: 'Arbitrator SPDC crystal emitting correlated photon pairs at λ=1550nm. Bell non-locality calibrated at S = 2.78 ≥ 2.00.',
        timestamp: formatRelTime(45000),
        timeAgo: '1m ago',
        createdAt: now - 45000,
        severity: 'SUCCESS',
        category: 'protocol',
        sourceNode: 'ARB-CORE',
        qber: '1.9%',
        chsh: '2.78',
        read: false,
        actionLabel: 'View Protocol Simulator',
        actionRoute: '/demonstration'
      },
      {
        id: 'notif-init-2',
        title: 'Joint Bell Measurement Authenticated',
        message: 'Alice completed Joint Bell State Measurement on payload hash. Feed-forward bits (b1, b2) synced with Bob Pauli corrections.',
        timestamp: formatRelTime(120000),
        timeAgo: '2m ago',
        createdAt: now - 120000,
        severity: 'INFO',
        category: 'attestation',
        sourceNode: 'QN-ALICE',
        qber: '1.9%',
        chsh: '2.76',
        read: false,
        actionLabel: 'Inspect Telemetry',
        actionRoute: '/monitoring'
      },
      {
        id: 'notif-init-3',
        title: 'Hoeffding Statistical Security Certified',
        message: 'Quantum bit error rate strictly within Hoeffding bound τ = 5.0%. Eavesdropping detection certainty > 99.99999%.',
        timestamp: formatRelTime(340000),
        timeAgo: '6m ago',
        createdAt: now - 340000,
        severity: 'INFO',
        category: 'telemetry',
        sourceNode: 'HOEFFDING-GATE',
        qber: '1.9%',
        chsh: '2.78',
        read: true,
        actionLabel: 'Open Forensic Audit',
        actionRoute: '/monitoring'
      },
      {
        id: 'notif-init-4',
        title: 'Toeplitz OTP Key Distillation Sealed',
        message: 'Privacy amplification distilled unforgeable 256-bit quantum one-time-pad signature token.',
        timestamp: formatRelTime(600000),
        timeAgo: '10m ago',
        createdAt: now - 600000,
        severity: 'SUCCESS',
        category: 'attestation',
        sourceNode: 'PRIVACY_AMP',
        read: true,
        actionLabel: 'View Transfer Logs',
        actionRoute: '/transfer'
      }
    ];
  });

  const broadcastNotifications = (next: QuantumNotification[]) => {
    try {
      localStorage.setItem('qds_notifications', JSON.stringify(next));
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('qds_notifications_bus');
        bc.postMessage({ type: 'SYNC_NOTIFICATIONS', payload: next });
        bc.close();
      }
    } catch {}
  };

  // Cross-tab real-time sync
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('qds_notifications_bus');
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_NOTIFICATIONS' && Array.isArray(event.data.payload)) {
            setNotifications(event.data.payload);
          }
        };
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'qds_notifications' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setNotifications(parsed);
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Live dynamic relative time ticker (updates "Just now", "25s ago", "2m ago" continuously)
  useEffect(() => {
    const ticker = setInterval(() => {
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          timeAgo: computeTimeAgo(n.createdAt, n.timeAgo)
        }))
      );
    }, 5000);
    return () => clearInterval(ticker);
  }, []);

  // Live background quantum event & telemetry stream
  useEffect(() => {
    const liveQuantumEvents = [
      {
        title: 'SPDC Entangled Pair Stream Calibrated',
        message: 'Arbitrator continuous wave pump verified photon pair emission at 775nm -> 1550nm. Bell non-locality S = 2.79 ≥ 2.00.',
        severity: 'SUCCESS' as const,
        category: 'protocol' as const,
        sourceNode: 'ARB-CORE',
        qber: '1.8%',
        chsh: '2.79',
        actionLabel: 'View Protocol Visualizer',
        actionRoute: '/demonstration'
      },
      {
        title: 'Hoeffding Statistical Confidence Refreshed',
        message: 'Quantum Bit Error Rate sampled over 10,000 pulses. Bound τ = 1.90% is strictly below 5.5% security gate cutoff.',
        severity: 'INFO' as const,
        category: 'telemetry' as const,
        sourceNode: 'HOEFFDING-GATE',
        qber: '1.9%',
        chsh: '2.76',
        actionLabel: 'Open SOC Telemetry',
        actionRoute: '/monitoring'
      },
      {
        title: 'Toeplitz OTP Hash Block Distilled',
        message: 'Toeplitz matrix hashing completed privacy amplification. Unconditional 256-bit one-time pad key generated.',
        severity: 'SUCCESS' as const,
        category: 'attestation' as const,
        sourceNode: 'PRIVACY_AMP',
        actionLabel: 'Inspect Transfer Log',
        actionRoute: '/transfer'
      },
      {
        title: 'Pauli Frame Synchronization Heartbeat',
        message: 'Feed-forward Pauli corrections σ_Z / σ_X aligned between Alice and Bob nodes with zero packet jitter.',
        severity: 'INFO' as const,
        category: 'protocol' as const,
        sourceNode: 'QN-BOB',
        qber: '1.9%',
        chsh: '2.78',
        actionLabel: 'View Topology',
        actionRoute: '/demonstration'
      }
    ];

    let pulseIndex = 0;
    const streamTimer = setInterval(() => {
      // Only stream routine background protocol heartbeats if channel is nominal and no duplicate active alert
      if (!eveActive) {
        const item = liveQuantumEvents[pulseIndex % liveQuantumEvents.length];
        pulseIndex++;
        addNotification({
          ...item,
          timestamp: formatIstTime(new Date(), false)
        });
      }
    }, 45000);

    return () => clearInterval(streamTimer);
  }, [eveActive]);



  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const openNotificationCenter = () => setIsNotificationCenterOpen(true);
  const closeNotificationCenter = () => setIsNotificationCenterOpen(false);
  const toggleNotificationCenter = () => setIsNotificationCenterOpen((prev) => !prev);

  const addNotification = (notif: Omit<QuantumNotification, 'id' | 'timestamp' | 'read'> & { id?: string; timestamp?: string; read?: boolean; createdAt?: number }) => {
    const createdAt = notif.createdAt || Date.now();
    const newId = notif.id || `notif-${createdAt}-${Math.floor(Math.random() * 1000)}`;
    const newTimestamp = notif.timestamp || formatIstTime(createdAt, false);
    const newNotif: QuantumNotification = {
      ...notif,
      id: newId,
      timestamp: newTimestamp,
      createdAt,
      timeAgo: computeTimeAgo(createdAt),
      read: notif.read ?? false
    };

    setNotifications((prev) => {
      // Deduplicate: ignore if an unread notification with the same title already exists
      const isDuplicate = prev.some((n) => n.title === newNotif.title && (!n.read || (createdAt - (n.createdAt || 0)) < 45000));
      if (isDuplicate) return prev;

      const next = [newNotif, ...prev].slice(0, 50);
      broadcastNotifications(next);
      return next;
    });

    playQuantumChime(notif.severity);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      broadcastNotifications(next);
      return next;
    });
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      broadcastNotifications(next);
      return next;
    });
    toast.success('All notifications marked as read');
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      broadcastNotifications(next);
      return next;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    broadcastNotifications([]);
    toast.success('All notifications cleared');
  };

  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryItem[]>(() => {
    const now = Date.now();
    const formatRelTime = (offsetMs: number) => formatIstTime(now - offsetMs, true);
    try {
      const stored = localStorage.getItem('qds_telemetry_logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const freshItems = parsed.filter(item => {
            if (!item.createdAt || typeof item.createdAt !== 'number') return false;
            const age = now - item.createdAt;
            return age >= 0 && age < 900000; // only keep items from last 15 minutes
          });
          if (freshItems.length > 0) {
            return sortTelemetryDesc(freshItems);
          }
        }
      }
    } catch { }
    return [
      { id: 'evt-0', createdAt: now - 1200, time: formatRelTime(1200), source: 'ARB-CORE', text: 'SPDC photon pair routed to Alice & Bob via Dark Fiber Link 1', ms: '12ms', code: '200 OK', qber: '1.9%', chsh: '2.78', payloadContent: 'board-resolution.pdf' },
      { id: 'evt-1', createdAt: now - 4800, time: formatRelTime(4800), source: 'QN-ALICE', text: 'Joint Bell State Measurement completed for session QKD-260827-91F4', ms: '18ms', code: '200 OK', qber: '1.9%', chsh: '2.76', payloadContent: 'board-resolution.pdf' },
      { id: 'evt-2', createdAt: now - 11500, time: formatRelTime(11500), source: 'HOEFFDING-GATE', text: 'Hoeffding statistical bound audit passed · QBER <= 5.50%', ms: '20ms', code: '200 OK', qber: '1.9%', chsh: '2.78', payloadContent: 'board-resolution.pdf' },
      { id: 'evt-3', createdAt: now - 24000, time: formatRelTime(24000), source: 'PRIVACY_AMP', text: 'Toeplitz hash distillation: 1024 raw bits -> 256 secure entropy bits', ms: '9ms', code: '200 OK', qber: '1.9%', chsh: '2.76', payloadContent: 'board-resolution.pdf' },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('qds_telemetry_logs', JSON.stringify(telemetryLogs));
    } catch { }
  }, [telemetryLogs]);

  useEffect(() => {
    let bc: BroadcastChannel | null = null;

    const handlePayload = (msgType: string, payload: any) => {
      if (msgType === 'ATTACK_TRIGGERED') {
        if (payload?.attackTitle) {
          setActiveAttack(payload.attackTitle);
          const isAtk = payload.attackTitle !== 'Clean signature';
          setEveActive(isAtk);
          try { localStorage.setItem('qds_eve_active', String(isAtk)); } catch { }
        }
        if (payload?.qber) setQber(payload.qber);
        if (payload?.chsh) setChsh(payload.chsh);
        if (payload?.newEvents) {
          setTelemetryLogs(prev => sortTelemetryDesc([...payload.newEvents, ...prev]).slice(0, 100));
        }
        if (payload?.newThreat) {
          setThreats(prev => [payload.newThreat, ...prev.filter(t => t.id !== payload.newThreat.id)]);
        }
        if (payload?.newInc) {
          setIncidents(prev => [payload.newInc, ...prev.filter(i => i.id !== payload.newInc.id)]);
        }
      } else if (msgType === 'NEW_TELEMETRY_ITEM') {
        if (payload?.newEvents) {
          setTelemetryLogs(prev => sortTelemetryDesc([...payload.newEvents, ...prev]).slice(0, 100));
        }
        if (payload?.newThreat) {
          setThreats(prev => [payload.newThreat, ...prev.filter(t => t.id !== payload.newThreat.id)]);
        }
        if (payload?.newInc) {
          setIncidents(prev => [payload.newInc, ...prev.filter(i => i.id !== payload.newInc.id)]);
        }
      } else if (msgType === 'CHANNEL_RESTORED') {
        setActiveAttack('Clean signature');
        setEveActive(false);
        try { localStorage.setItem('qds_eve_active', 'false'); } catch { }
        setQber(0.019);
        setChsh(2.76);
        if (payload?.newEvents) {
          setTelemetryLogs(prev => sortTelemetryDesc([...payload.newEvents, ...prev]).slice(0, 100));
        }
      }
    };

    try {
      bc = new BroadcastChannel('qds_quantum_telemetry');
      bc.onmessage = (event) => {
        handlePayload(event.data?.type, event.data?.payload);
      };
    } catch { }

    const handleCustomEvent = (e: any) => {
      if (e.detail) {
        handlePayload(e.detail.isThreat ? 'ATTACK_TRIGGERED' : 'NEW_TELEMETRY_ITEM', e.detail);
      }
    };
    window.addEventListener('qds_quantum_telemetry', handleCustomEvent);

    return () => {
      window.removeEventListener('qds_quantum_telemetry', handleCustomEvent);
      try { bc?.close(); } catch { }
    };
  }, []);

  const clearTelemetryLogs = () => {
    setTelemetryLogs([]);
    try {
      localStorage.removeItem('qds_telemetry_logs');
    } catch { }
    toast.success("Telemetry logs cleared");
  };

  const [incidents, setIncidents] = useState<IncidentItem[]>(() => {
    try {
      const stored = localStorage.getItem('qds_incidents');
      if (stored) return JSON.parse(stored);
    } catch { }
    return [
      {
        id: 'INC-9482-A',
        title: 'Quantum correlation breach',
        severity: 'HIGH',
        status: 'INVESTIGATING',
        assigned: 'Anisha S (L2)',
        impact: 'HIGH',
        qber: '7.42%',
        chsh: '2.12',
        timestamp: '10:58:02',
        analyst: 'Anisha S',
        detail: 'A QBER divergence on the authenticated channel is under active forensic review.',
        events: [
          ['10:58:02 UTC', 'Threat detected', 'QBER moved above the nominal confidence envelope (7.42% > 5.50%).'],
          ['10:58:10 UTC', 'Threshold exceeded', 'Photon-pair records sealed after the Hoeffding confidence boundary was crossed.'],
          ['10:59:01 UTC', 'Operator assignment', 'Incident assigned to the optical assurance queue.']
        ],
        helstrom: 'P_e ≥ 0.1140',
        traceDistance: 'D = 0.4140',
        targetNode: 'QN-ALICE (signer)'
      },
      {
        id: 'INC-9481-B',
        title: 'Quantum channel intercept-resend',
        severity: 'CRITICAL',
        status: 'INVESTIGATING',
        assigned: 'M. Ito (L3)',
        impact: 'CRITICAL',
        qber: '14.20%',
        chsh: '1.76',
        timestamp: '10:48:16',
        analyst: 'M. Ito',
        detail: '[CLASSIFIED: INTERCEPT_RESEND] Eavesdropper Eve intercepted and measured photons on the quantum channel, collapsing quantum superposition.',
        events: [
          ['10:48:16 UTC', 'Threat detected', 'CRITICAL: Intercept-resend attack detected. QBER (14.2%) breached Hoeffding cutoff (5.5%). Bell correlation collapsed (S=1.76 < 2.00).'],
          ['10:48:24 UTC', 'Threshold exceeded', 'QBER 14.20% breached security cutoff (5.0%). Non-locality collapsed (S=1.76).'],
          ['10:48:32 UTC', 'Escalation', 'Channel held for signature acceptance review and L3 forensic handoff.']
        ],
        helstrom: 'P_e ≥ 0.0820',
        traceDistance: 'D = 0.8360',
        targetNode: 'QN-BOB (receiver)'
      },
      {
        id: 'INC-9479-X',
        title: 'Channel lockout mitigation',
        severity: 'LOW',
        status: 'RESOLVED',
        assigned: 'SYSTEM AUTO',
        impact: 'LOW',
        qber: '4.88%',
        chsh: '2.68',
        timestamp: '10:42:01',
        analyst: 'SYSTEM AUTO',
        detail: 'An automated channel lock was applied after repeated authentication failures on the secure transport boundary.',
        events: [
          ['10:42:01 UTC', 'Threat detected', 'Anomaly detected in the authenticated command sequence from 192.168.1.55.'],
          ['10:42:15 UTC', 'Threshold exceeded', 'Five failed authentication attempts occurred inside the ten-second observation window.'],
          ['10:42:16 UTC', 'Auto-resolution', 'A temporary perimeter quarantine was applied and the node was removed from active routing.']
        ],
        helstrom: 'P_e ≥ 0.1464',
        traceDistance: 'D = 0.1720',
        targetNode: 'ARBITRATOR core'
      }
    ];
  });

  const [threats, setThreats] = useState<ThreatAnomalyItem[]>(() => {
    try {
      const stored = localStorage.getItem('qds_threats');
      if (stored) return JSON.parse(stored);
    } catch { }
    const now = Date.now();
    const relIst = (offsetSec: number) => formatIstTime(now - offsetSec * 1000, false);
    return [
      { id: 'THR-104', severity: 'CRITICAL', origin: 'THREAT ENGINE', badge: 'QUARANTINED', type: 'Signature aborted (intercept-resend eavesdropping)', time: relIst(60), baseline: '1.2%', current: '14.2%', detail: 'Intercept-resend disturbance triggered the confidence boundary and halted the signature stream.', qber: 0.142, chsh: 1.76 },
      { id: 'THR-103', severity: 'CRITICAL', origin: 'NODE-EVE-01', badge: '', type: 'Quantum channel intercept-resend', time: relIst(120), baseline: '1.5%', current: '12.7%', detail: 'Unauthorized basis observation was inferred from the observed QBER uplift.', qber: 0.127, chsh: 1.82 },
      { id: 'THR-102', severity: 'CRITICAL', origin: 'NONCE-CACHE-01', badge: '', type: 'Stale nonce and payload replay', time: relIst(240), baseline: '0.8%', current: '9.1%', detail: 'Replay candidate reappeared outside the permitted one-time-pad window.', qber: 0.091, chsh: 1.91 },
      { id: 'THR-101', severity: 'CRITICAL', origin: 'ARB-CORE-01', badge: '', type: 'One-time pad signature forgery', time: relIst(360), baseline: '1.0%', current: '8.4%', detail: 'Signature mismatch appeared after the classical correction frame closed.', qber: 0.084, chsh: 1.95 },
      { id: 'THR-100', severity: 'HIGH', origin: '192.168.1.104', badge: '', type: 'Sift mismatch breach', time: relIst(480), baseline: '1.9%', current: '7.7%', detail: 'Sifting disagreement exceeded the nominal data-reconciliation threshold.', qber: 0.077, chsh: 2.05 },
      { id: 'THR-099', severity: 'HIGH', origin: 'QKD-NODE-07', badge: '', type: 'Pauli frame mismatch', time: relIst(600), baseline: '2.1%', current: '5.7%', detail: 'A correction frame checksum failed verification.', qber: 0.057, chsh: 2.22 },
      { id: 'THR-098', severity: 'MEDIUM', origin: 'FIBER-22', badge: '', type: 'Optical noise envelope', time: relIst(900), baseline: '1.4%', current: '3.9%', detail: 'Attenuation drift is observable but remains below the intervention threshold.', qber: 0.039, chsh: 2.45 }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('qds_threats', JSON.stringify(threats));
    } catch { }
  }, [threats]);

  useEffect(() => {
    try {
      localStorage.setItem('qds_incidents', JSON.stringify(incidents));
    } catch { }
  }, [incidents]);

  useEffect(() => {
    try {
      localStorage.setItem('qds_qber', String(qber));
      localStorage.setItem('qds_chsh', String(chsh));
      localStorage.setItem('qds_active_attack', activeAttack);
      localStorage.setItem('qds_pqc_mode', String(pqcMode));
    } catch { }
  }, [qber, chsh, activeAttack, pqcMode]);

  const [sessions, setSessions] = useState<SessionStreamItem[]>([
    { id: '01', endpoint: 'QNode-A-09', state: 'STABLE', rate: '245.8', duration: '04:12:33', trace: 'wave', tone: 'good' },
    { id: '02', endpoint: 'QNode-F-22', state: 'DEGRADED', rate: '112.4', duration: '01:45:10', trace: 'rise', tone: 'copper' },
    { id: '03', endpoint: 'Sat-Link-Alpha', state: 'STABLE', rate: '450.1', duration: '12:05:44', trace: 'step', tone: 'good' },
    { id: '04', endpoint: 'QNode-B-17', state: 'STABLE', rate: '193.7', duration: '00:54:12', trace: 'wave-low', tone: 'blue' }
  ]);

  const [payloads, setPayloads] = useState<TransmissionRecord[]>([
    {
      id: "TX-3635",
      time: "02:51:30.587",
      verification: "Verified / PQC Dilithium3 fallback",
      title: "Classified defense telemetry",
      body: "CLASSIFIED DEFENSE TELEMETRY: Quantum one-time-pad key handshake verified for orbital satellite relay Alpha-09.",
      signature: "PQC LATTICE SIGNATURE (CRYSTALS-DILITHIUM3 / ML-DSA-65):\n3a7d9f2e4b6c8d0ef1a3b5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e...",
      digest: "0x3a7d9f2e4b6c8d0ef1a3b5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7",
      qber: "8.77%",
      chsh: "1.77",
      pauli: "PQC ML-DSA-65",
      tone: "pqc",
      metricTone: "text-copper"
    },
    {
      id: "TX-2853",
      time: "20:42:10.301",
      verification: "Verified / physical QDS",
      title: "Authenticated routing manifest",
      body: "QDS transport layer confirmed a physical signature match for the protected relay schedule.",
      signature: "PHYSICAL QDS ATTESTATION:\nBell-state witness sealed · optical entropy verified · channel path authenticated",
      digest: "0x9f1c84b2e7a048db392fe190ca8817bca4d019f20e8b8392a104c8f2b7a901ee",
      qber: "1.90%",
      chsh: "2.78",
      pauli: "I · σZ",
      tone: "good",
      metricTone: "status-text-good"
    }
  ]);

  const getAttackDiagnostics = (title: string, qberVal: number, chshVal: number) => {
    if (title.includes('MitM')) {
      return `THREAT DIAGNOSIS [MITM INTERCEPT-RESEND]
1. Adversarial Tap: Eve intercepted photon pulses on fiber link quantum-link-01, performing unauthorized basis measurements.
2. Quantum Decoherence: QBER surged to ${(qberVal * 100).toFixed(1)}% (breaching the 5.50% Hoeffding bound). Bell CHSH collapsed to S=${chshVal.toFixed(2)} (< 2.00 classical limit).

AUTOMATED REMEDIATION PLAN EXECUTED
1. Zeroized physical sifted key registers from volatile hardware RAM.
2. Dynamic PQC Handover: Hot-swapped quantum channel to NIST CRYSTALS-Dilithium3 (ML-DSA-65) post-quantum signature.
3. Isolated probe tap EVE-PROBE-07 and alerted L3 SOC Operations.`;
    }
    if (title.includes('Forgery')) {
      return `THREAT DIAGNOSIS [FEED-FORWARD BIT FORGERY]
1. Integrity Breach: Tampering identified in classical reconciliation feed-forward bits during Pauli frame alignment.
2. Anomaly Metric: QBER reached ${(qberVal * 100).toFixed(1)}%, Bell CHSH S=${chshVal.toFixed(2)}. Signature attestation aborted.

AUTOMATED REMEDIATION PLAN EXECUTED
1. Flushed reconciliation buffer and revoked tainted session token.
2. PQC Fallback Activated: Encapsulated payload with ML-DSA-65 lattice signature.
3. Node Alice re-authenticated with fresh Toeplitz hash witness.`;
    }
    if (title.includes('Replay')) {
      return `THREAT DIAGNOSIS [STALE NONCE REPLAY ATTACK]
1. Replay Vector: Captured transmission nonce retransmitted outside the authorized 10-second OTP window.
2. Security Breach: QBER elevated to ${(qberVal * 100).toFixed(1)}%, CHSH S=${chshVal.toFixed(2)}. Timestamp hash mismatch detected.

AUTOMATED REMEDIATION PLAN EXECUTED
1. Expired nonce cache purged and blacklisted globally across all arbitrating nodes.
2. Engaged NIST Kyber768 / Dilithium3 Post-Quantum Key Encapsulation.
3. Channel locked for forensic integrity snapshot.`;
    }
    if (title.includes('PNS')) {
      return `THREAT DIAGNOSIS [PHOTON-NUMBER SPLITTING (PNS) TAP]
1. Multiphoton Eavesdropping: Probe isolated multi-photon pulses from SPDC source, siphoning key bits without full state collapse.
2. Metric Breach: QBER measured at ${(qberVal * 100).toFixed(1)}% with CHSH S=${chshVal.toFixed(2)}.

AUTOMATED REMEDIATION PLAN EXECUTED
1. Switched source to decoy-state protocol with randomized photon intensities.
2. Re-routed active traffic to CRYSTALS-Dilithium3 post-quantum lattice channel.`;
    }
    if (title.includes('Noise') || title.includes('Jamming')) {
      return `THREAT DIAGNOSIS [ADVERSARIAL CHANNEL NOISE & OPTICAL JAMMING ATTACK]
1. Malicious Optical Jamming: Eve actively injected incoherent photon bursts / laser noise to blind Single-Photon Avalanche Diodes (SPADs) and mask eavesdropping.
2. Noise Discrimination Violation:
   - Measured QBER: ${(qberVal * 100).toFixed(2)}% (Breached Hoeffding statistical bound cutoff of 5.50%).
   - CHSH Bell Parameter: S=${chshVal.toFixed(2)} (< 2.00 classical boundary - Entanglement collapsed).
   - Trace Distance D(ρ,σ) = 0.8120 (Confirms intentional state disturbance, distinguishing from Gaussian thermal drift).

AUTOMATED REMEDIATION PLAN EXECUTED
1. Flagged Eve as active adversarial noise source; blacklisted compromised optical wavelength.
2. Quantum link transmission aborted to prevent key compromise / QDoS.
3. Post-Quantum Cryptographic Fallback engaged: Activated CRYSTALS-Dilithium3 / ML-DSA-65 signatures & ML-KEM-768 key exchange.`;
    }
    return `STATUS NOMINAL [QUANTUM SECURE]
1. Physical QDS teleportation keys verified with zero eavesdropping.
2. QBER is ${(qberVal * 100).toFixed(2)}% (within 5.5% bound). Bell non-locality CHSH S=${chshVal.toFixed(2)} > 2.0 (quantum secure).`;
  };

  const toggleEve = async () => {
    const nextEve = !eveActive;
    setEveActive(nextEve);
    const newQber = nextEve ? 0.142 : 0.019;
    const newChsh = nextEve ? 1.76 : 2.76;
    setQber(newQber);
    setChsh(newChsh);

    const nowStr = formatIstTime(new Date(), true);

    try {
      if (nextEve) {
        await apiClient.injectAttack('forgery');
      }
      const res = await apiClient.auditAndRemediate({ qber_override: newQber, chsh_score: newChsh });
      setPqcMode(res.status === 'PQC_FALLBACK_ACTIVE');
      setRemediationReport(res.ai_cognitive_report || getAttackDiagnostics('MitM attack', newQber, newChsh));
    } catch {
      setPqcMode(nextEve);
      setRemediationReport(getAttackDiagnostics(nextEve ? 'MitM attack' : 'Clean signature', newQber, newChsh));
    }

    if (nextEve) {
      setActiveAttack('MitM attack');
      const newEvt: TelemetryItem = {
        id: `evt-mitm-${Date.now()}`,
        time: nowStr,
        source: 'EVE-PROBE',
        text: 'Intercept-resend attack tap detected on optical link (QBER 14.2%)',
        ms: '85ms',
        code: '403 FORBIDDEN',
        qber: '14.2%',
        chsh: '1.76',
        isThreat: true,
        createdAt: Date.now()
      };
      setTelemetryLogs((prev) => sortTelemetryDesc([newEvt, ...prev]).slice(0, 100));

      const newInc: IncidentItem = {
        id: `INC-2026-${Math.floor(1000 + Math.random() * 8999)}`,
        title: 'Man-in-the-Middle Interception Tap',
        severity: 'CRITICAL',
        status: 'INVESTIGATING',
        assigned: 'A. Kovacs (L2)',
        impact: 'CRITICAL',
        qber: '14.20%',
        chsh: '1.76',
        timestamp: nowStr.slice(0, 8),
        analyst: 'A. Kovacs',
        detail: 'QBER 14.2% crossed Hoeffding threshold cutoff (5.5%). Bell correlation collapsed (S=1.76 < 2.0).',
        events: [
          [`${nowStr.slice(0, 8)} IST`, 'Eavesdropping Intercept', 'Eve tapped fiber channel 01; state collapse identified.'],
          [`${nowStr.slice(0, 8)} IST`, 'Hoeffding Breach', 'QBER breached 5.50% statistical confidence bound.'],
          [`${nowStr.slice(0, 8)} IST`, 'PQC Fallback', 'CRYSTALS-Dilithium3 post-quantum handover engaged.']
        ],
        helstrom: 'P_e ≥ 0.0820',
        traceDistance: 'D = 0.8360',
        targetNode: 'QN-BOB (receiver)'
      };
      setIncidents((prev) => [newInc, ...prev]);

      setSessions((prev) => prev.map((s, i) => i === 0 ? { ...s, state: 'DEGRADED', tone: 'copper', rate: '84.2', trace: 'rise' } : s));

      addNotification({
        title: 'CRITICAL: Quantum Channel Intrusion Detected (Eve MitM Tap)',
        message: 'Photon intercept-resend attack active on quantum channel 01. QBER breached cutoff at 14.2% (threshold 5.5%), Bell CHSH collapsed to S=1.76.',
        severity: 'CRITICAL',
        category: 'security',
        sourceNode: 'EVE-PROBE',
        qber: '14.2%',
        chsh: '1.76',
        actionLabel: 'Inspect in SOC Console',
        actionRoute: '/monitoring'
      });

      toast.error("Global Threat Injected: Eve interception active across all quantum channels! QBER = 14.2%. SOC Dashboard updated!");
    } else {
      setActiveAttack('Clean signature');
      const newEvt: TelemetryItem = {
        id: `evt-restored-${Date.now()}`,
        time: nowStr,
        source: 'ARB-CORE',
        text: 'Channel restored · Eve bypassed · QBER returned to nominal 1.9%',
        ms: '12ms',
        code: '200 OK',
        qber: '1.9%',
        chsh: '2.76',
        isThreat: false,
        createdAt: Date.now()
      };
      setTelemetryLogs((prev) => sortTelemetryDesc([newEvt, ...prev]).slice(0, 100));

      setSessions((prev) => prev.map((s, i) => i === 0 ? { ...s, state: 'STABLE', tone: 'good', rate: '245.8', trace: 'wave' } : s));

      addNotification({
        title: 'Quantum Channel Pristine · Eve Bypassed',
        message: 'Adversary Eve isolated. SPDC entangled pair distribution operating at nominal QBER 1.9% with Bell non-locality S=2.76 ≥ 2.00.',
        severity: 'SUCCESS',
        category: 'protocol',
        sourceNode: 'ARB-CORE',
        qber: '1.9%',
        chsh: '2.76',
        actionLabel: 'View Protocol Visualizer',
        actionRoute: '/demonstration'
      });

      toast.success("Global Channel Restored: Eve bypassed. Quantum channel operating at nominal QBER = 1.9%.");
    }
  };

  const triggerAttack = async (attackTitle: string, customQber?: number, customChsh?: number) => {
    setActiveAttack(attackTitle);
    const profile = getQuantumThresholdProfile(attackTitle);
    const isClean = attackTitle === "Clean signature";
    const isAdversarialNoise = attackTitle.includes("Noise") || attackTitle.includes("Jamming");

    const defaultQber = isClean ? 0.019 : isAdversarialNoise ? 0.108 : 0.142;
    const defaultChsh = isClean ? 2.76 : isAdversarialNoise ? 1.74 : 1.76;

    const targetQber = customQber ?? defaultQber;
    const targetChsh = customChsh ?? defaultChsh;
    setQber(targetQber);
    setChsh(targetChsh);

    const isBreached = targetQber > profile.threshold || targetChsh < 2.0;
    const isThreat = !isClean;
    setEveActive(isThreat);

    const nowStr = formatIstTime(new Date(), true);
    const diagReport = getAttackDiagnostics(attackTitle, targetQber, targetChsh);

    try {
      let attackType: 'forgery' | 'replay' | 'noise' | 'pns' = 'forgery';
      if (attackTitle.includes("Replay")) attackType = 'replay';
      else if (attackTitle.includes("Noise") || attackTitle.includes("Jamming")) attackType = 'noise';
      else if (attackTitle.includes("PNS")) attackType = 'pns';

      if (isThreat) {
        await apiClient.injectAttack(attackType);
      }

      const res = await apiClient.auditAndRemediate({ qber_override: targetQber, chsh_score: targetChsh });
      setPqcMode(res.status === 'PQC_FALLBACK_ACTIVE');
      setRemediationReport(res.ai_cognitive_report || diagReport);
    } catch {
      setPqcMode(isThreat);
      setRemediationReport(diagReport);
    }

    const qberFormatted = `${(targetQber * 100).toFixed(1)}%`;
    const chshFormatted = targetChsh.toFixed(2);
    const baseNow = Date.now();
    const formatTimeWithOffset = (msOffset: number) => formatIstTime(baseNow + msOffset, true);

    if (isThreat) {
      // Adversarial breach (MitM, Forgery, Replay, PNS, Adversarial Noise Injection)
      addNotification({
        title: isAdversarialNoise ? `Adversarial Noise Attack: ${attackTitle}` : `Adversarial Threat Injected: ${attackTitle}`,
        message: isAdversarialNoise
          ? `Malicious optical noise injection / jamming detected. QBER ${qberFormatted} breached Hoeffding cutoff ${profile.thresholdPercent}. Bell non-locality collapsed to S=${chshFormatted} (< 2.00). Automated PQC handover initiated.`
          : `High-vigilance quantum anomaly detected. QBER ${qberFormatted} breached Hoeffding cutoff ${profile.thresholdPercent}. Bell non-locality collapsed to S=${chshFormatted} (< 2.00). Automated PQC handover initiated.`,
        severity: 'CRITICAL',
        category: 'security',
        sourceNode: 'HOEFFDING-GATE',
        qber: qberFormatted,
        chsh: chshFormatted,
        actionLabel: 'Open Sandbox Forensics',
        actionRoute: '/attack-sandbox'
      });

      setPqcMode(true);
      const newEvents: TelemetryItem[] = [
        {
          id: `evt-${Date.now()}-6`,
          createdAt: baseNow + 500,
          time: formatIstTime(baseNow + 500, true),
          source: 'ARBITRATOR-VERDICT',
          text: `Protocol Rejected (PQC Fallback) · Optical disturbance flagged on channel`,
          ms: '4ms',
          code: 'PQC_OK',
          qber: qberFormatted,
          chsh: chshFormatted,
          payloadContent: 'board-resolution.pdf',
          isThreat: false
        },
        {
          id: `evt-${Date.now()}-5`,
          createdAt: baseNow + 400,
          time: formatIstTime(baseNow + 400, true),
          source: 'PQC-GATEWAY',
          text: `PQC Fallback Signature Sealed · CRYSTALS-Dilithium3 / ML-DSA-65 active`,
          ms: '6ms',
          code: 'PQC_OK',
          qber: qberFormatted,
          chsh: chshFormatted,
          payloadContent: 'board-resolution.pdf',
          isThreat: false
        },
        {
          id: `evt-${Date.now()}-4`,
          createdAt: baseNow + 300,
          time: formatIstTime(baseNow + 300, true),
          source: 'BELL-WITNESS',
          text: `CHSH Bell test failed: S=${chshFormatted} collapsed to classical limit (S < 2.00)`,
          ms: '19ms',
          code: '0xFA BREACH',
          qber: qberFormatted,
          chsh: chshFormatted,
          payloadContent: 'board-resolution.pdf',
          isThreat: true
        },
        {
          id: `evt-${Date.now()}-3`,
          createdAt: baseNow + 200,
          time: formatIstTime(baseNow + 200, true),
          source: 'HOEFFDING-AUDIT',
          text: isAdversarialNoise
            ? `[NOISE DISCRIMINATOR: ATTACK DETECTED] Statistical test failed: Artificial noise density (QBER ${qberFormatted} > limit ${profile.thresholdPercent})`
            : `Hoeffding Bound Breached: QBER reached ${qberFormatted} (limit ${profile.thresholdPercent})`,
          ms: '8ms',
          code: '0xFA BREACH',
          qber: qberFormatted,
          chsh: chshFormatted,
          payloadContent: 'board-resolution.pdf',
          isThreat: true
        },
        {
          id: `evt-${Date.now()}-2`,
          createdAt: baseNow + 100,
          time: formatIstTime(baseNow + 100, true),
          source: 'EVE-PROBE',
          text: isAdversarialNoise
            ? `[ADVERSARIAL NOISE INJECTION] High-power incoherent jamming pulses injected by Eve`
            : `[ATTACK ACTIVE: ${attackTitle.toUpperCase()}] Intercept-resend / Malformed feed-forward disturbance detected`,
          ms: '14ms',
          code: '0xFA BREACH',
          qber: qberFormatted,
          chsh: chshFormatted,
          payloadContent: 'board-resolution.pdf',
          isThreat: true
        },
        {
          id: `evt-${Date.now()}-1`,
          createdAt: baseNow,
          time: formatIstTime(baseNow, true),
          source: 'QN-ALICE',
          text: `Alice Bell Measurement (BSM) · State collapse observed across qubit pairs`,
          ms: '16ms',
          code: '0xFA BREACH',
          qber: qberFormatted,
          chsh: chshFormatted,
          payloadContent: 'board-resolution.pdf',
          isThreat: true
        }
      ];
      setTelemetryLogs((prev) => sortTelemetryDesc([...newEvents, ...prev]).slice(0, 100));

      const uniqueSuffix = Date.now().toString().slice(-4) + '-' + Math.floor(Math.random() * 900 + 100);
      const newThreat: ThreatAnomalyItem = {
        id: `THR-LIVE-${uniqueSuffix}`,
        severity: 'CRITICAL',
        origin: 'ATTACK SANDBOX / EVE',
        badge: 'ACTIVE ATTACK',
        type: `Live Injection: ${attackTitle}`,
        time: formatTimeWithOffset(500).slice(0, 8),
        baseline: '1.9%',
        current: qberFormatted,
        detail: `Adversarial scenario "${attackTitle}" injected from sandbox. QBER=${qberFormatted}, CHSH S=${chshFormatted}. PQC fallback ready.`,
        qber: targetQber,
        chsh: targetChsh
      };
      setThreats((prev) => [newThreat, ...prev]);

      const newInc: IncidentItem = {
        id: `INC-LIVE-${uniqueSuffix}`,
        title: `Simulated Breach: ${attackTitle}`,
        severity: 'CRITICAL',
        status: 'INVESTIGATING',
        assigned: 'Anisha S (L2)',
        impact: 'CRITICAL',
        qber: qberFormatted,
        chsh: chshFormatted,
        timestamp: nowStr.slice(0, 8),
        analyst: 'Anisha S',
        detail: `QBER ${qberFormatted} reached Hoeffding threshold cutoff (${profile.thresholdPercent}). CHSH Bell violation collapsed (S=${chshFormatted} < 2.0). Attack vector: ${attackTitle}.`,
        events: [
          [`${nowStr.slice(0, 8)} IST`, `Attack Staged: ${attackTitle}`, `Adversarial injection initiated via Red-Team Sandbox.`],
          [`${nowStr.slice(0, 8)} IST`, 'Hoeffding Bound Breach', `Statistical error rate reached ${qberFormatted} (limit ${profile.thresholdPercent}).`],
          [`${nowStr.slice(0, 8)} IST`, 'Automated PQC Handover', 'Engaged CRYSTALS-Dilithium3 / ML-DSA-65 post-quantum lattice signature.']
        ],
        helstrom: targetQber > 0.1 ? 'P_e ≥ 0.0820' : 'P_e ≥ 0.1240',
        traceDistance: targetQber > 0.1 ? 'D = 0.8360' : 'D = 0.4420',
        targetNode: attackTitle.includes('Forgery') ? 'QN-ALICE (signer)' : 'QN-BOB (receiver)'
      };
      setIncidents((prev) => [newInc, ...prev]);

      setSessions((prev) => prev.map((s, i) => i === 0 ? {
        ...s,
        state: 'DEGRADED',
        tone: 'copper',
        rate: '82.5',
        trace: 'rise'
      } : s));

      try {
        const bc = new BroadcastChannel('qds_quantum_telemetry');
        bc.postMessage({ type: 'ATTACK_TRIGGERED', payload: { attackTitle, qber: targetQber, chsh: targetChsh, newEvents, newThreat, newInc } });
        bc.close();
      } catch { }

      try {
        localStorage.setItem('qds_active_attack', attackTitle);
        localStorage.setItem('qds_qber', targetQber.toString());
        localStorage.setItem('qds_chsh', targetChsh.toString());
      } catch { }

      toast.error(`[SOC DASHBOARD UPDATED] ${attackTitle} active! Metrics, Incidents, Threats & Live Telemetry synced.`);
    } else {
      const cleanEvents: TelemetryItem[] = [
        {
          id: `evt-${Date.now()}-c3`,
          createdAt: baseNow + 300,
          time: formatIstTime(baseNow + 300, true),
          source: 'PRIVACY_AMP',
          text: 'Toeplitz Hash Distillation · 1024 raw bits -> 256 unforgeable quantum OTP tokens',
          ms: '8ms',
          code: '200 OK',
          qber: '1.9%',
          chsh: '2.76',
          payloadContent: 'board-resolution.pdf',
          isThreat: false
        },
        {
          id: `evt-${Date.now()}-c2`,
          createdAt: baseNow + 200,
          time: formatIstTime(baseNow + 200, true),
          source: 'QN-ALICE',
          text: 'Alice Bell Measurement (BSM) · Joint EPR projection verified (zero eavesdropping)',
          ms: '16ms',
          code: '200 OK',
          qber: '1.9%',
          chsh: '2.76',
          payloadContent: 'board-resolution.pdf',
          isThreat: false
        },
        {
          id: `evt-${Date.now()}-c1`,
          createdAt: baseNow + 100,
          time: formatIstTime(baseNow + 100, true),
          source: 'ARBITRATOR',
          text: 'Clean Channel Restored · Authenticated Bell-pair exchange online',
          ms: '12ms',
          code: '200 OK',
          qber: '1.9%',
          chsh: '2.76',
          payloadContent: 'board-resolution.pdf',
          isThreat: false
        }
      ];
      setTelemetryLogs((prev) => sortTelemetryDesc([...cleanEvents, ...prev]).slice(0, 100));

      setThreats((prev) => prev.filter(t => !t.id.startsWith('THR-LIVE')));
      setIncidents((prev) => prev.filter(i => i.id !== 'INC-2026-LIVE'));

      setSessions((prev) => prev.map((s, i) => i === 0 ? {
        ...s,
        state: 'STABLE',
        tone: 'good',
        rate: '245.8',
        trace: 'wave'
      } : s));

      try {
        const bc = new BroadcastChannel('qds_quantum_telemetry');
        bc.postMessage({ type: 'CHANNEL_RESTORED', payload: { attackTitle: 'Clean signature', qber: 0.019, chsh: 2.76, newEvents: cleanEvents } });
        bc.close();
      } catch { }

      try {
        localStorage.setItem('qds_active_attack', 'Clean signature');
        localStorage.setItem('qds_qber', '0.019');
        localStorage.setItem('qds_chsh', '2.76');
      } catch { }

      toast.success("[SOC DASHBOARD UPDATED] Clean channel & nominal telemetry restored.");
    }
  };

  const pushTelemetryLogs = (items: TelemetryItem[]) => {
    const stamped = items.map(it => ({ ...it, createdAt: it.createdAt || Date.now() }));
    setTelemetryLogs((prev) => sortTelemetryDesc([...stamped, ...prev]).slice(0, 100));

    const threatItems = items.filter(i => i.isThreat || i.code.includes('403') || i.code.includes('0xFA') || i.code.includes('REJECT') || i.code.includes('503') || i.source.includes('EVE'));

    let newThreat: ThreatAnomalyItem | undefined;
    let newInc: IncidentItem | undefined;

    if (threatItems.length > 0) {
      const top = threatItems[0];
      const nowTime = top.time ? top.time.split('.')[0] : formatIstTime(new Date(), false);
      const qberNum = parseFloat(top.qber?.replace('%', '') || '14.2') / 100;
      const chshNum = parseFloat(top.chsh || '1.76');

      newThreat = {
        id: `THR-LIVE-${Date.now().toString().slice(-4)}`,
        severity: qberNum > 0.10 ? 'CRITICAL' : 'HIGH',
        origin: top.source,
        badge: top.code,
        type: top.source.includes('EVE') ? 'Adversarial Intercept (Eve Tap)' : top.source.includes('HOEFFDING') ? 'Hoeffding Statistical Breach' : 'Quantum Disturbance',
        time: nowTime,
        baseline: '1.9%',
        current: top.qber || '14.2%',
        detail: top.text,
        qber: qberNum,
        chsh: chshNum
      };

      newInc = {
        id: `INC-LIVE-${Date.now().toString().slice(-4)}`,
        title: top.source.includes('EVE') ? 'Optical Intercept & State Collapse' : 'Quantum Statistical Boundary Breach',
        severity: qberNum > 0.10 ? 'CRITICAL' : 'HIGH',
        status: 'INVESTIGATING',
        assigned: 'SOC Operator / QDS AI',
        impact: qberNum > 0.10 ? 'CRITICAL' : 'HIGH',
        qber: top.qber || '14.20%',
        chsh: top.chsh || '1.76',
        timestamp: nowTime,
        analyst: 'Automated SOC Probe',
        detail: `[FORENSIC EVIDENCE CAPTURED] ${top.text} · Source: ${top.source} · Code: ${top.code}`,
        events: [
          [`${nowTime} IST`, 'Anomaly raised in live stream', top.text],
          [`${nowTime} IST`, 'Hoeffding limit breach', `Observed QBER ${top.qber} breached security threshold. Bell score S=${top.chsh}.`],
          [`${nowTime} IST`, 'Containment protocol active', 'L3 Forensic evidence isolated. Dilithium3 PQC fallback armed.']
        ],
        helstrom: 'P_e ≥ 0.0820',
        traceDistance: 'D = 0.8360',
        targetNode: top.source
      };

      setThreats((prev) => [newThreat!, ...prev.filter(t => t.id !== newThreat!.id)]);
      setIncidents((prev) => [newInc!, ...prev.filter(i => i.id !== newInc!.id)]);
    }

    try {
      const bc = new BroadcastChannel('qds_quantum_telemetry');
      bc.postMessage({
        type: 'NEW_TELEMETRY_ITEM',
        payload: {
          newEvents: items,
          newThreat,
          newInc
        }
      });
      bc.close();
    } catch { }
  };

  const sendTransmission = async (payload: { mode: 'message' | 'document'; message?: string; file?: File | null; digest?: string | null }) => {
    const txId = "TX-" + Math.floor(1000 + Math.random() * 8999);
    const nowTime = formatIstTime(new Date(), true);
    const isDoc = payload.mode === "document" && Boolean(payload.file);
    const payloadTitle = isDoc && payload.file ? payload.file.name : (payload.message?.slice(0, 32) || "quantum signed message");
    
    let payloadHash = payload.digest;
    if (!payloadHash) {
      if (isDoc && payload.file) {
        try {
          const buf = await payload.file.arrayBuffer();
          const hashBuf = await crypto.subtle.digest("SHA-256", buf);
          payloadHash = "0x" + Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
        } catch {
          payloadHash = "0x" + Math.random().toString(16).slice(2).padStart(64, '0');
        }
      } else if (payload.message) {
        try {
          const enc = new TextEncoder().encode(payload.message);
          const hashBuf = await crypto.subtle.digest("SHA-256", enc);
          payloadHash = "0x" + Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
        } catch {
          payloadHash = "0x" + Math.random().toString(16).slice(2).padStart(64, '0');
        }
      } else {
        payloadHash = "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      }
    }

    let res: any = null;
    try {
      res = await apiClient.auditAndRemediate({
        document_hash: payloadHash,
        qber_override: qber,
        chsh_score: chsh
      });
    } catch {
      // fallback
    }

    const fallbackActive = res ? res.status === 'PQC_FALLBACK_ACTIVE' : (eveActive || qber > 0.055);
    const hexOnly = payloadHash.replace(/^0x/, '');
    const defaultPqcSig = `PQC LATTICE SIGNATURE (CRYSTALS-DILITHIUM3 / ML-DSA-65):\n${hexOnly.slice(0, 32)}${hexOnly.slice(0, 24)}9f1a3b5b7c9d1e3f5a7b9c1d3e5f7a9b...`;
    const defaultPhysicalSig = `PHYSICAL QDS ATTESTATION:\nBell-state witness sealed [digest: ${payloadHash.slice(0, 18)}...] · optical entropy verified · channel path authenticated`;

    const sig = fallbackActive
      ? (res?.fallback_signature ? `PQC LATTICE SIGNATURE (CRYSTALS-DILITHIUM3 / ML-DSA-65):\n${res.fallback_signature}` : defaultPqcSig)
      : defaultPhysicalSig;

    const record: TransmissionRecord = {
      id: txId,
      time: nowTime,
      verification: fallbackActive ? "Verified / PQC Dilithium3 fallback engaged" : "Verified / physical QDS",
      title: isDoc && payload.file ? payload.file.name : "quantum signed payload",
      body: isDoc && payload.file
        ? `DOCUMENT PAYLOAD: ${payload.file.name} · sealed for authenticated delivery across channel ${activeSessionId}.`
        : payload.message || "Empty payload",
      signature: sig,
      digest: payloadHash,
      qber: `${(qber * 100).toFixed(2)}%`,
      chsh: chsh.toFixed(2),
      pauli: fallbackActive ? "PQC ML-DSA-65" : "I · σZ",
      tone: fallbackActive ? "pqc" : "good",
      metricTone: fallbackActive ? "text-copper" : "status-text-good"
    };

    setPayloads((prev) => [record, ...prev]);

    const displayPayload = isDoc && payload.file
      ? payload.file.name
      : (payload.message ? payload.message.slice(0, 10) : "EMPTY");

    // Push 3 live telemetry events for this transfer execution
    const txEvents: TelemetryItem[] = [
      {
        id: `evt-tx-${Date.now()}-1`,
        time: nowTime,
        source: 'QN-ALICE',
        text: `[TRANSFER DISPATCH] "${payloadTitle}" hashed (SHA-256: ${payloadHash.slice(0, 16)}...) · sealed for dispatch [${txId}]`,
        ms: '8ms',
        code: '200 OK',
        qber: `${(qber * 100).toFixed(1)}%`,
        chsh: chsh.toFixed(2),
        payloadContent: displayPayload,
        isThreat: false
      },
      {
        id: `evt-tx-${Date.now()}-2`,
        time: nowTime,
        source: fallbackActive ? 'EVE-PROBE' : 'ARB-CORE',
        text: fallbackActive
          ? `[TRANSFER INTERCEPT] Eavesdropping disturbance detected on optical fiber relay · QBER elevated (${(qber * 100).toFixed(1)}%)`
          : `[TRANSFER] Arbitrator verified optical entropy witness · Bell non-locality confirmed (S=${chsh.toFixed(2)})`,
        ms: fallbackActive ? '82ms' : '15ms',
        code: fallbackActive ? '403 FORBIDDEN' : '200 OK',
        qber: `${(qber * 100).toFixed(1)}%`,
        chsh: chsh.toFixed(2),
        payloadContent: displayPayload,
        isThreat: fallbackActive
      },
      {
        id: `evt-tx-${Date.now()}-3`,
        time: nowTime,
        source: 'QN-BOB',
        text: fallbackActive
          ? `[TRANSFER COMPLETE] NIST Dilithium3 Post-Quantum Fallback signature verified & accepted at Node Beta`
          : `[TRANSFER COMPLETE] Physical QDS teleportation signature verified unconditionally at Node Beta`,
        ms: '11ms',
        code: fallbackActive ? 'PQC_VERIFIED' : '200 OK',
        qber: `${(qber * 100).toFixed(1)}%`,
        chsh: chsh.toFixed(2),
        payloadContent: displayPayload,
        isThreat: fallbackActive
      }
    ];

    pushTelemetryLogs(txEvents);

    if (fallbackActive) {
      toast.warning(`Payload ${txId} transmitted under attack! PQC Dilithium3 Fallback signature generated successfully.`);
    } else {
      toast.success(`Payload ${txId} verified and delivered via physical QDS channel.`);
    }
  };

  const executeProtocolRun = async (documentName: string = 'board-resolution.pdf', isEveActive?: boolean) => {
    const isThreat = isEveActive ?? eveActive;
    const nowStr = formatIstTime(new Date(), true);

    let res: any = null;
    try {
      res = await apiClient.runWorkflow({
        document_name: documentName,
        num_pairs: 100,
        is_eve_active: isThreat,
        attack_type: isThreat ? 'mitm' : 'clean'
      });
    } catch {
      // Fallback
      res = {
        session_id: `QKD-${Date.now().toString().slice(-4)}`,
        status: isThreat ? 'REJECTED' : 'VERIFIED',
        metrics: {
          qber: isThreat ? 0.142 : 0.016,
          chsh_score: isThreat ? 1.76 : 2.81,
          hoeffding_threshold: 0.055
        },
        verdict: {
          verdict: isThreat ? 'REJECT' : 'ACCEPT',
          threat_detected: isThreat
        }
      };
    }

    const runQber = isThreat ? (res?.metrics?.qber ?? 0.142) : (res?.metrics?.qber && res.metrics.qber <= 0.055 ? res.metrics.qber : 0.019);
    const runChsh = isThreat ? (res?.metrics?.chsh_score ?? 1.76) : (res?.metrics?.chsh_score && res.metrics.chsh_score >= 2.0 ? res.metrics.chsh_score : 2.76);
    const isRejected = isThreat;
    const qberStr = `${(runQber * 100).toFixed(1)}%`;
    const chshStr = runChsh.toFixed(2);

    setQber(runQber);
    setChsh(runChsh);
    setPqcMode(isRejected);

    const now = Date.now();
    const timeWithOffset = (offsetMs: number) => formatIstTime(now + offsetMs, true);

    const newProtocolEvents: TelemetryItem[] = [
      {
        id: `evt-${now}-5`,
        time: timeWithOffset(120),
        source: 'ARBITRATOR-VERDICT',
        text: isRejected
          ? `[DECISION: REJECT] Security threat confirmed · dynamic CRYSTALS-Dilithium3 PQC handover engaged`
          : `[DECISION: ACCEPT] Quantum digital signature sealed and verified unforgeable`,
        ms: '6ms',
        code: isRejected ? 'REJECT_PQC' : 'ACCEPT_200',
        qber: qberStr,
        chsh: chshStr,
        payloadContent: documentName,
        isThreat: isRejected
      },
      {
        id: `evt-${now}-4`,
        time: timeWithOffset(90),
        source: 'HOEFFDING-GATE',
        text: isRejected
          ? `Phase 04: Hoeffding test threshold breached (QBER ${qberStr} > 5.50% cutoff) · CHSH S=${chshStr} < 2.0`
          : `Phase 04: Hoeffding statistical bound test passed (QBER ${qberStr} <= 5.50% cutoff) · CHSH S=${chshStr} >= 2.0`,
        ms: '14ms',
        code: isRejected ? '0xFA BREACH' : '200 OK',
        qber: qberStr,
        chsh: chshStr,
        payloadContent: documentName,
        isThreat: isRejected
      },
      {
        id: `evt-${now}-3`,
        time: timeWithOffset(60),
        source: isThreat ? 'EVE-PROBE' : 'QN-BOB',
        text: isThreat
          ? `[EVE INTERCEPT DETECTED] Optical tap collapsed superposition state on fiber link 01`
          : `Bob Pauli alignment completed: σX/σZ applied · quantum state fidelity verified`,
        ms: isThreat ? '85ms' : '19ms',
        code: isThreat ? '403 FORBIDDEN' : '200 OK',
        qber: qberStr,
        chsh: chshStr,
        payloadContent: documentName,
        isThreat: isThreat
      },
      {
        id: `evt-${now}-2`,
        time: timeWithOffset(30),
        source: 'QN-ALICE',
        text: `Alice Bell-state measurement (BSM) executed on "${documentName}" · feed-forward bits generated`,
        ms: '18ms',
        code: '200 OK',
        qber: qberStr,
        chsh: chshStr,
        payloadContent: documentName,
        isThreat: false
      },
      {
        id: `evt-${now}-1`,
        time: timeWithOffset(0),
        source: 'ARB-CORE',
        text: `[PROTOCOL DEMO] SPDC Photon pair distribution (1550nm) initialized for session ${res?.session_id || 'QKD-260827-91F4'}`,
        ms: '12ms',
        code: '200 OK',
        qber: qberStr,
        chsh: chshStr,
        payloadContent: documentName,
        isThreat: false
      }
    ];

    pushTelemetryLogs(newProtocolEvents);

    if (isThreat) {
      const uniqueSuffix = Date.now().toString().slice(-4) + '-' + Math.floor(Math.random() * 900 + 100);
      const newThreat: ThreatAnomalyItem = {
        id: `THR-LIVE-${uniqueSuffix}`,
        severity: 'CRITICAL',
        origin: 'DEMONSTRATION PROTOCOL / EVE',
        badge: 'ACTIVE ATTACK',
        type: 'Live Protocol Intercept',
        time: nowStr.slice(0, 8),
        baseline: '1.9%',
        current: qberStr,
        detail: `Adversarial intercept on document "${documentName}". QBER=${qberStr}, CHSH S=${chshStr}.`,
        qber: runQber,
        chsh: runChsh
      };
      setThreats((prev) => [newThreat, ...prev]);

      const newInc: IncidentItem = {
        id: `INC-LIVE-${uniqueSuffix}`,
        title: `Protocol Anomaly: Intercept on "${documentName}"`,
        severity: 'CRITICAL',
        status: 'INVESTIGATING',
        assigned: 'Anisha S (L2)',
        impact: 'CRITICAL',
        qber: qberStr,
        chsh: chshStr,
        timestamp: nowStr.slice(0, 8),
        analyst: 'Anisha S',
        detail: `QBER ${qberStr} breached Hoeffding threshold during protocol demonstration run on "${documentName}".`,
        events: [
          [`${nowStr.slice(0, 8)} IST`, `Protocol Demonstration Run: ${documentName}`, `Adversarial probe active on transmission.`],
          [`${nowStr.slice(0, 8)} IST`, 'Hoeffding Bound Breach', `Statistical error rate reached ${qberStr}.`],
          [`${nowStr.slice(0, 8)} IST`, 'Automated PQC Handover', 'Engaged CRYSTALS-Dilithium3 / ML-DSA-65 post-quantum lattice signature.']
        ],
        helstrom: 'P_e ≥ 0.0820',
        traceDistance: 'D = 0.8360',
        targetNode: 'QN-BOB (receiver)'
      };
      setIncidents((prev) => [newInc, ...prev]);

      addNotification({
        title: `Protocol Interception Detected: "${documentName}"`,
        message: `Live demonstration intercepted. QBER ${qberStr} breached Hoeffding cutoff, Bell score S=${chshStr} collapsed. PQC lattice backup engaged.`,
        severity: 'CRITICAL',
        category: 'protocol',
        sourceNode: 'DEMO-RUNNER',
        qber: qberStr,
        chsh: chshStr,
        actionLabel: 'View Demonstration',
        actionRoute: '/demonstration'
      });
    } else {
      addNotification({
        title: `Protocol Verified & Attested: "${documentName}"`,
        message: `Six-phase physical quantum digital signature completed with 100% fidelity. Bell score S=${chshStr} ≥ 2.00 sealed.`,
        severity: 'SUCCESS',
        category: 'protocol',
        sourceNode: 'DEMO-RUNNER',
        qber: qberStr,
        chsh: chshStr,
        actionLabel: 'View Demonstration',
        actionRoute: '/demonstration'
      });
    }

    return res;
  };

  const resolveIncident = (id: string) => {
    setIncidents((prev) => prev.map(inc => inc.id === id ? { ...inc, status: 'RESOLVED' } : inc));
    addNotification({
      title: `Incident ${id} Resolved`,
      message: `Security investigation completed. Channel parameter verified within acceptable confidence threshold.`,
      severity: 'SUCCESS',
      category: 'security',
      sourceNode: 'SOC-ANALYST',
      actionLabel: 'View Incidents',
      actionRoute: '/monitoring'
    });
    toast.success(`Incident ${id} marked as RESOLVED.`);
  };

  const escalateIncident = (id: string) => {
    const timeStr = formatIstTime(new Date(), false) + ' IST';
    setIncidents((prev) => prev.map(inc => {
      if (inc.id === id) {
        const newEvent: [string, string, string] = [
          timeStr,
          'L3 Escalation',
          'Incident escalated to L3 Principal Quantum Cryptanalyst (M. Ito). Automated containment & forensic sandbox active.'
        ];
        return {
          ...inc,
          status: 'ESCALATED' as const,
          assigned: 'M. Ito (L3 Lead)',
          impact: 'CRITICAL' as const,
          events: [newEvent, ...(inc.events || [])]
        };
      }
      return inc;
    }));
    addNotification({
      title: `CRITICAL Incident ${id} Escalated`,
      message: `Incident escalated to L3 lead. Post-quantum cryptographic handover confirmed.`,
      severity: 'CRITICAL',
      category: 'security',
      sourceNode: 'SOC-ESCALATION',
      actionLabel: 'View Incidents',
      actionRoute: '/monitoring'
    });
    toast.error(`Incident ${id} escalated to L3 Lead (M. Ito).`);
  };

  const quarantineNode = (nodeId: string) => {
    addNotification({
      title: `Node ${nodeId} Quarantined`,
      message: `Optical switch dynamically isolated ${nodeId} from active quantum key distribution path.`,
      severity: 'WARNING',
      category: 'security',
      sourceNode: 'SOC-ROUTER',
      actionLabel: 'Inspect Topology',
      actionRoute: '/monitoring'
    });
    toast.error(`Containment protocol executed: ${nodeId} quarantined from optical routing.`);
  };

  const resetChannel = () => {
    setEveActive(false);
    setQber(0.019);
    setChsh(2.76);
    setPqcMode(false);
    setRemediationReport(null);
    setActiveAttack('Clean signature');
    setThreats((prev) => prev.filter(t => !t.id.startsWith('THR-LIVE')));
    setIncidents((prev) => prev.filter(i => i.id !== 'INC-2026-LIVE'));
    setSessions((prev) => prev.map((s, i) => i === 0 ? { ...s, state: 'STABLE', tone: 'good', rate: '245.8', trace: 'wave' } : s));
    addNotification({
      title: 'Global System Reset: Nominal Baseline Restored',
      message: 'Global quantum channel telemetry re-initialized. QBER 1.9%, Bell score S=2.76, all nodes authenticated.',
      severity: 'SUCCESS',
      category: 'system',
      sourceNode: 'ARB-CORE',
      qber: '1.9%',
      chsh: '2.76',
      actionLabel: 'Open Switchboard',
      actionRoute: '/home'
    });
    toast.success("Global Quantum Channel reset to pristine nominal state.");
  };

  return (
    <SentinelContext.Provider value={{
      eveActive,
      activeSessionId,
      qber,
      chsh,
      pqcMode,
      remediationReport,
      payloads,
      telemetryLogs,
      incidents,
      threats,
      sessions,
      activeAttack,
      hoeffdingThreshold,
      thresholdProfile,
      notifications,
      unreadNotificationCount,
      isNotificationCenterOpen,
      openNotificationCenter,
      closeNotificationCenter,
      toggleNotificationCenter,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      clearAllNotifications,
      deleteNotification,
      addNotification,
      toggleEve,
      triggerAttack,
      executeProtocolRun,
      pushTelemetryLogs,
      sendTransmission,
      resetChannel,
      resolveIncident,
      escalateIncident,
      quarantineNode,
      clearTelemetryLogs
    }}>
      {children}
    </SentinelContext.Provider>
  );
};

export const useSentinel = () => {
  const context = useContext(SentinelContext);
  if (!context) {
    throw new Error('useSentinel must be used within a SentinelProvider');
  }
  return context;
};


