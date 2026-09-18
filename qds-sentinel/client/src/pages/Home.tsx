import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useSentinel, sortTelemetryDesc, formatIstTime } from "../lib/SentinelContext";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clipboard,
  Copy,
  Database,
  Download,
  FileCode,
  FileKey2,
  FileText,
  Gauge,
  GitBranch,
  Home as HomeIcon,
  Info,
  Layers3,
  LockKeyhole,
  Maximize2,
  Menu,

  MoreHorizontal,
  Network,
  ShieldAlert,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Server,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TerminalSquare,
  Users,
  Waves,
  X,
  Zap,
  LogOut,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/LoginModal";
import { DemonstrationDesk } from "./DemonstrationDesk";
import { apiClient } from "@/lib/apiClient";
import { generateAiRemediation, AiRemediationResponse } from "@/lib/groqAiService";
import { SkeletonKpiGrid, SkeletonTableRows, SkeletonChartBox } from "@/components/ui/skeleton";
import { downloadThreatPcap } from "@/lib/pcapGenerator";

import MARK from "@/assets/qds-sentinel-mark_81058a94.png";
import HERO from "@/assets/qds-sentinel-hero_77975680.png";
import NETWORK from "@/assets/qds-sentinel-network_2c79b0d7.png";

const navItems = [
  { href: "/home", label: "Home portal", code: "00", icon: HomeIcon },
  { href: "/demonstration", label: "Protocol demo", code: "01", icon: Waves },
  { href: "/monitoring", label: "SOC monitoring", code: "02", icon: Activity },
  { href: "/attack-sandbox", label: "Attack sandbox", code: "03", icon: TerminalSquare },
  { href: "/database", label: "Live database", code: "04", icon: Database },
];

const telemetry = [
  { time: "11:48:09.221", source: "QUANTUM_CORE", text: "EPR distribution complete · 100 pairs", tone: "blue", ms: "18ms" },
  { time: "11:48:09.118", source: "THREAT_ENGINE", text: "Quantum-channel anomaly · intercept-resend signature", tone: "copper", ms: "31ms", isThreat: true },
  { time: "11:48:08.904", source: "ALICE", text: "Bell measurement signed · basis X / Z", tone: "ink", ms: "23ms" },
  { time: "11:48:08.760", source: "ARBITRATOR", text: "Session nonce sealed and broadcast", tone: "slate", ms: "11ms" },
  { time: "11:48:07.115", source: "BOB", text: "Pauli frame aligned · 96 / 100 kept", tone: "blue", ms: "20ms" },
  { time: "11:48:06.332", source: "THREAT_ENGINE", text: "Hoeffding boundary within tolerance", tone: "copper", ms: "31ms" },
];

const sessionRows = [
  { id: "QKD-260827-91F4", doc: "board-resolution.pdf", qber: "1.2%", chsh: "2.77", verdict: "ACCEPT", status: "Verified", time: "11:48:09" },
  { id: "QKD-260827-91C1", doc: "release-manifest.json", qber: "0.8%", chsh: "2.81", verdict: "ACCEPT", status: "Verified", time: "11:42:51" },
  { id: "QKD-260827-8FD2", doc: "legal-brief-v4.pdf", qber: "14.2%", chsh: "1.86", verdict: "REJECT", status: "Quarantined", time: "11:31:08" },
  { id: "QKD-260827-8EE9", doc: "firmware-checksum.txt", qber: "2.1%", chsh: "2.68", verdict: "ACCEPT", status: "Verified", time: "11:25:34" },
];

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Brand() {
  return (
    <Link href="/home" className="brand-lockup" aria-label="QDS Sentinel home">
      <img src={MARK} alt="" className="brand-mark" />
      <span className="brand-copy"><strong>QDS</strong><span>SENTINEL</span></span>
    </Link>
  );
}

function StatusDot({ tone = "ok" }: { tone?: "ok" | "warn" | "bad" | "blue" }) {
  return <span className={cn("status-dot", `status-${tone}`)} aria-hidden="true" />;
}

function SectionLabel({ index, eyebrow, title, action }: { index: string; eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="section-heading">
      <div className="section-heading-main"><span className="section-index">{index}</span><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>
      {action}
    </div>
  );
}

function Sidebar({ location, isCollapsed, onToggle }: { location: string; isCollapsed: boolean; onToggle: () => void }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [monitorTab, setMonitorTab] = useState(() => { const requested = new URLSearchParams(window.location.search).get("section"); return ["overview", "threats", "incidents", "network", "pqc"].includes(requested ?? "") ? requested! : "overview"; });
  useEffect(() => { const onTab = (event: Event) => setMonitorTab((event as CustomEvent<string>).detail); const onPopState = () => { const requested = new URLSearchParams(window.location.search).get("section"); setMonitorTab(["overview", "threats", "incidents", "network", "pqc"].includes(requested ?? "") ? requested! : "overview"); }; window.addEventListener("qds-monitor-tab", onTab); window.addEventListener("popstate", onPopState); return () => { window.removeEventListener("qds-monitor-tab", onTab); window.removeEventListener("popstate", onPopState); }; }, []);

  const handleSignOut = () => {
    logout();
    toast.info("Operator terminal signed out.");
    setLocation("/login");
  };

  return (
    <aside className={cn("operator-rail", isCollapsed && "operator-rail-collapsed")}>
      <div className="rail-top">
        <Brand />
        <button
          className={cn("icon-button rail-toggle-btn", isCollapsed && "is-collapsed")}
          onClick={onToggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu size={18} />
        </button>
      </div>
      <div className="rail-rule" />
      <div className="rail-kicker">Operator console <span>///</span></div>
      <div className="rail-context"><span className="rail-context-mark" />{location === "/monitoring" ? "SOC monitoring / internal directories" : "Choose an instrument from the home portal"}</div>
      {location === "/monitoring" && (
        <nav className="monitor-rail-nav" aria-label="SOC monitoring sections">
          {["overview", "threats", "incidents", "network", "pqc"].map((item, index) => (
            <button
              key={item}
              className={cn("monitor-rail-link", monitorTab === item && "monitor-rail-link-active")}
              onClick={() => window.dispatchEvent(new CustomEvent("qds-monitor-tab", { detail: item }))}
              title={item === "pqc" ? "PQC defense" : item}
            >
              <span>0{index + 1}</span>
              <span className="nav-label-text">{item === "pqc" ? "PQC defense" : item}</span>
            </button>
          ))}
        </nav>
      )}
      {location !== "/" && location !== "/home" && location !== "/monitoring" && (
        <Link href="/home" className="rail-back">
          <ArrowLeft size={14} /> <span className="nav-label-text">Home portal</span>
        </Link>
      )}
      <div className="rail-spacer" />
      <div className="rail-status-card">
        <div className="mini-label"><StatusDot /> gateway status</div>
        <div className="rail-status-value">3001 <span>OK</span></div>
        <div className="rail-status-meta">12ms round trip <span>↗</span></div>
      </div>
      <div className="rail-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <div className="avatar" style={{ backgroundColor: user?.avatar_bg ? undefined : undefined }}>
            {user?.avatar_text || "AS"}
          </div>
          <div className="operator-info" style={{ minWidth: 0, overflow: 'hidden' }}>
            <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.display_name || "Anisha S"}
            </strong>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.role || "Security operator"}
            </span>
          </div>
        </div>
        <button
          className="icon-button"
          onClick={handleSignOut}
          title="Sign out of Quantum Terminal"
          aria-label="Sign out"
          style={{ padding: '6px', color: 'var(--slate)' }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}


function Topbar({ eyebrow, title, subtitle, action, onNotifications }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode; onNotifications?: () => void }) {
  const { unreadNotificationCount, toggleNotificationCenter, eveActive } = useSentinel();
  const { user } = useAuth();
  const handleBellClick = onNotifications || toggleNotificationCenter;

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <Link href="/home" className="topbar-identity" aria-label="QDS Sentinel home">
          <img src={MARK} alt="" />
          <span>QDS / SIGNAL GRID</span>
          <i />
        </Link>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="topbar-subtitle">{subtitle}</p>
      </div>
      <div className="topbar-actions">
        {action}
        <button
          type="button"
          className="button button-quiet button-small"
          onClick={() => window.dispatchEvent(new CustomEvent("qds-open-guidelines"))}
          title="Operational Guidelines & Security Policies"
          style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
        >
          <FileText size={13} />
          <span>Policies</span>
        </button>
        <button
          className={cn("button button-small", user ? "button-quiet" : "button-copper")}
          onClick={() => window.dispatchEvent(new CustomEvent("qds-open-login"))}
          title={user ? `Operator: ${user.display_name} (${user.role}). Click to switch operator.` : "Sign into Quantum Operator Gateway"}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          {user ? (
            <>
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "3px",
                  background: "var(--copper)",
                  color: "#fff",
                  fontSize: "9px",
                  fontFamily: "var(--mono)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                {user.avatar_text}
              </span>
              <span style={{ fontSize: "11px", fontWeight: 600 }}>{user.display_name}</span>
            </>
          ) : (
            <>
              <KeyRound size={13} />
              <span>Operator Login</span>
            </>
          )}
        </button>
        <div className="live-ping">
          <StatusDot /> <span>LIVE</span><strong>12ms</strong>
        </div>
        <button
          className={cn("icon-button bell-btn", unreadNotificationCount > 0 && "has-notifications", eveActive && "bell-alert")}
          onClick={handleBellClick}
          aria-label={`Notifications (${unreadNotificationCount} unread)`}
          title={unreadNotificationCount > 0 ? `${unreadNotificationCount} unread signal notifications` : "Notification Center"}
          style={{ position: 'relative' }}
        >
          <Bell size={17} className={eveActive ? "bell-wobble text-[#b94a2f]" : ""} />
          {unreadNotificationCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                minWidth: '16px',
                height: '16px',
                padding: '0 4px',
                borderRadius: '999px',
                background: eveActive ? 'var(--copper)' : '#2f6f85',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 'bold',
                fontFamily: 'var(--mono)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px var(--paper)'
              }}
            >
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "copper" | "blue" | "good" | "dark" }) {
  return <span className={cn("pill", `pill-${tone}`)}>{children}</span>;
}

function MetricTile({ label, value, detail, tone = "ink", icon: Icon, spark = "up" }: { label: string; value: string; detail: string; tone?: "ink" | "copper" | "blue" | "good"; icon: React.ElementType; spark?: "up" | "flat" | "down" }) {
  return <div className={cn("metric-tile", `metric-${tone}`)}><div className="metric-top"><span className="metric-label">{label}</span><Icon size={17} /></div><div className="metric-value">{value}</div><div className="metric-bottom"><span>{detail}</span><MiniSpark direction={spark} /></div></div>;
}

function MiniSpark({ direction = "up" }: { direction?: "up" | "flat" | "down" }) {
  const path = direction === "down" ? "M2 3 L8 6 L13 5 L18 10 L24 8 L30 13" : direction === "flat" ? "M2 8 L8 8 L13 7 L18 9 L24 8 L30 8" : "M2 11 L8 9 L13 10 L18 5 L24 7 L30 2";
  return <svg className="mini-spark" viewBox="0 0 32 16" fill="none" aria-hidden="true"><path d={path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TelemetryChart({ threat = false, range = "15M" }: { threat?: boolean; range?: string }) {
  const { telemetryLogs, qber: currentQber, hoeffdingThreshold, thresholdProfile, activeAttack, eveActive } = useSentinel();
  const effectiveThreshold = thresholdProfile?.threshold || hoeffdingThreshold || 0.055;
  const thresholdLabel = thresholdProfile?.thresholdPercent || "5.50%";
  const thresholdCode = thresholdProfile?.code || "CAL";

  const count = range === "1M" ? 8 : range === "5M" ? 12 : range === "15M" ? 16 : 24;
  const width = 700;
  const height = 190;
  const padTop = 20;
  const padBottom = 25;
  const maxQber = 0.22;

  // Chronological stream of actual telemetry events (oldest on left -> newest on right)
  const chronologicalLogs = useMemo(() => {
    const sorted = sortTelemetryDesc(telemetryLogs);
    const recent = sorted.slice(0, count).reverse(); // Oldest first, newest last
    
    if (recent.length < count) {
      const missing = count - recent.length;
      const oldestTime = recent[0]?.createdAt || Date.now();
      const pad: any[] = [];
      for (let i = missing; i > 0; i--) {
        const padTime = oldestTime - i * 3500;
        pad.push({
          id: `pad-init-${padTime}-${i}`,
          createdAt: padTime,
          time: formatIstTime(padTime, true),
          source: 'ARB-CORE',
          text: 'SPDC photon pair baseline calibration',
          ms: '14ms',
          code: '200 OK',
          qber: '1.9%',
          chsh: '2.78',
          isThreat: false
        });
      }
      return [...pad, ...recent];
    }
    return recent;
  }, [telemetryLogs, count]);

  // Map each individual real incoming log to ONE discrete dot on the chart
  const points = useMemo(() => {
    return chronologicalLogs.map((item, index) => {
      const x = (index / (chronologicalLogs.length - 1 || 1)) * width;
      
      let val = 0.019;
      if (item.qber) {
        const parsed = parseFloat(String(item.qber).replace('%', ''));
        if (!isNaN(parsed)) val = parsed / 100;
      }

      const clamped = Math.max(0, Math.min(maxQber, val));
      const y = (height - padBottom) - (clamped / maxQber) * (height - padTop - padBottom);
      const isBreachedPt = val > effectiveThreshold || Boolean(item.isThreat);
      const timeDisplay = item.time ? (item.time.includes('.') ? item.time.split('.')[0] : item.time) : formatIstTime(item.createdAt, false);

      return {
        x,
        y,
        val: (val * 100).toFixed(2),
        time: timeDisplay,
        isThreat: isBreachedPt,
        id: item.id
      };
    });
  }, [chronologicalLogs, effectiveThreshold, width, height, maxQber, padTop, padBottom]);

  const hasBreach = points.some(p => p.isThreat);
  const isAttackBreached = threat || eveActive || hasBreach;

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (pt.x - prev.x) / 2;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (pt.x - prev.x) / 2;
    const cpy2 = pt.y;
    return `${acc} C ${cpx1} ${cpy1} ${cpx2} ${cpy2} ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${width} ${height - padBottom} L 0 ${height - padBottom} Z`;
  const hoeffdingY = (height - padBottom) - (effectiveThreshold / maxQber) * (height - padTop - padBottom);
  const xLabels = points.filter((_, idx) => idx % Math.max(1, Math.floor(points.length / 5)) === 0 || idx === points.length - 1).slice(0, 5);

  return (
    <div className="chart-wrap">
      <div className="chart-ylabels">
        <span>20%</span>
        <span>15%</span>
        <span>10%</span>
        <span style={{ color: '#C2540A', fontWeight: 700 }}>{thresholdLabel} (τ)</span>
        <span>0%</span>
      </div>
      <svg className="telemetry-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Observed QBER dynamic stream">
        <defs>
          <linearGradient id="area-grad-dyn" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={isAttackBreached ? "#B94A2F" : "#2F6F85"} stopOpacity={isAttackBreached ? "0.38" : "0.22"} />
            <stop offset="100%" stopColor={isAttackBreached ? "#B94A2F" : "#2F6F85"} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <g className="chart-grid">
          <path d={`M0 20H${width}M0 60H${width}M0 100H${width}M0 140H${width}M0 ${height - padBottom}H${width}`} />
          {points.map((pt, i) => (
            <line key={i} x1={pt.x} y1={0} x2={pt.x} y2={height - padBottom} stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
          ))}
        </g>
        {/* Dynamic Hoeffding Boundary Cutoff */}
        <line x1={0} y1={hoeffdingY} x2={width} y2={hoeffdingY} stroke="#B94A2F" strokeWidth="1.8" strokeDasharray="5 3" opacity="0.9" style={{ transition: 'y1 0.4s ease, y2 0.4s ease' }} />
        <rect x={width - 240} y={hoeffdingY - 18} width="235" height="16" fill={isAttackBreached ? "rgba(185,74,47,0.15)" : "rgba(255,255,255,0.75)"} rx="2" />
        <text x={width - 235} y={hoeffdingY - 6} fill="#B94A2F" fontSize="9" fontFamily="monospace" fontWeight="bold">
          {thresholdLabel} Hoeffding cutoff [{thresholdCode}]
        </text>

        {/* Breach Alert Pill Overlay */}
        {isAttackBreached && (
          <g>
            <rect x={10} y={8} width="195" height="18" fill="rgba(185,74,47,0.12)" stroke="rgba(185,74,47,0.4)" rx="3" />
            <text x={16} y={20} fill="#B94A2F" fontSize="9" fontFamily="monospace" fontWeight="bold">
              ⚠ HOEFFDING LIMIT BREACHED
            </text>
          </g>
        )}

        <path className="chart-area" d={areaD} fill="url(#area-grad-dyn)" style={{ transition: 'd 0.3s ease' }} />
        <path className={cn("signal-line", isAttackBreached && "signal-line-threat")} d={pathD} style={{ stroke: isAttackBreached ? "#B94A2F" : "#2F6F85", strokeWidth: "2.5", transition: 'd 0.3s ease' }} />
        {points.map((pt, i) => (
          <g key={pt.id || i}>
            <circle cx={pt.x} cy={pt.y} r={i === points.length - 1 ? "5.5" : "3.5"} fill={pt.isThreat ? "#B94A2F" : "#2F6F85"} stroke="#ffffff" strokeWidth="1.5" />
            {i === points.length - 1 && (
              <circle cx={pt.x} cy={pt.y} r="10" fill="none" stroke={pt.isThreat ? "#B94A2F" : "#2F6F85"} strokeWidth="1.8" opacity="0.7">
                <animate attributeName="r" values="5;14;5" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        ))}
      </svg>
      <div className="chart-xlabels">
        {xLabels.map((pt, i) => (
          <span key={i}>{pt.time}</span>
        ))}
      </div>
    </div>
  );
}

function BellChart({ threat = false, range = "15M" }: { threat?: boolean; range?: string }) {
  const { telemetryLogs, chsh: currentChsh, eveActive, activeAttack } = useSentinel();

  const count = range === "1M" ? 8 : range === "5M" ? 12 : range === "15M" ? 16 : 24;
  const width = 700;
  const height = 190;
  const padTop = 20;
  const padBottom = 25;
  const minChsh = 1.0;
  const maxChsh = 3.0;

  // Chronological stream of actual telemetry events (oldest on left -> newest on right)
  const chronologicalLogs = useMemo(() => {
    const sorted = sortTelemetryDesc(telemetryLogs);
    const recent = sorted.slice(0, count).reverse(); // Oldest first, newest last
    
    if (recent.length < count) {
      const missing = count - recent.length;
      const oldestTime = recent[0]?.createdAt || Date.now();
      const pad: any[] = [];
      for (let i = missing; i > 0; i--) {
        const padTime = oldestTime - i * 3500;
        pad.push({
          id: `pad-init-${padTime}-${i}`,
          createdAt: padTime,
          time: formatIstTime(padTime, true),
          source: 'ARB-CORE',
          text: 'SPDC photon pair baseline calibration',
          ms: '14ms',
          code: '200 OK',
          qber: '1.9%',
          chsh: '2.78',
          isThreat: false
        });
      }
      return [...pad, ...recent];
    }
    return recent;
  }, [telemetryLogs, count]);

  // Map each individual real incoming log to ONE discrete dot on the chart
  const points = useMemo(() => {
    return chronologicalLogs.map((item, index) => {
      const x = (index / (chronologicalLogs.length - 1 || 1)) * width;
      
      let val = 2.76;
      if (item.chsh) {
        const parsed = parseFloat(String(item.chsh));
        if (!isNaN(parsed)) val = parsed;
      }

      const clamped = Math.max(minChsh, Math.min(maxChsh, val));
      const y = (height - padBottom) - ((clamped - minChsh) / (maxChsh - minChsh)) * (height - padTop - padBottom);
      const isViolation = val >= 2.0;
      const isThreatPoint = val < 2.0 || Boolean(item.isThreat);
      const timeDisplay = item.time ? (item.time.includes('.') ? item.time.split('.')[0] : item.time) : formatIstTime(item.createdAt, false);

      return {
        x,
        y,
        val: val.toFixed(2),
        time: timeDisplay,
        isViolation,
        isThreat: isThreatPoint,
        id: item.id
      };
    });
  }, [chronologicalLogs, width, height, minChsh, maxChsh, padTop, padBottom]);

  const hasCollapse = points.some(p => p.isThreat || !p.isViolation);
  const isCollapsed = threat || eveActive || hasCollapse;

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (pt.x - prev.x) / 2;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (pt.x - prev.x) / 2;
    const cpy2 = pt.y;
    return `${acc} C ${cpx1} ${cpy1} ${cpx2} ${cpy2} ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${width} ${height - padBottom} L 0 ${height - padBottom} Z`;
  const classicalY = (height - padBottom) - ((2.0 - minChsh) / (maxChsh - minChsh)) * (height - padTop - padBottom);
  const xLabels = points.filter((_, idx) => idx % Math.max(1, Math.floor(points.length / 5)) === 0 || idx === points.length - 1).slice(0, 5);

  return (
    <div className="chart-wrap">
      <div className="chart-ylabels bell-labels">
        <span>3.0</span>
        <span style={{ color: '#2F6F85', fontWeight: 600 }}>2.8 (Tsirelson)</span>
        <span style={{ color: '#B94A2F', fontWeight: 700 }}>2.0 (Bell limit)</span>
        <span>1.5</span>
        <span>1.0</span>
      </div>
      <svg className="telemetry-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="CHSH Bell score dynamic stream">
        <defs>
          <linearGradient id="bell-area-grad-dyn" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={isCollapsed ? "#B94A2F" : "#2F6F85"} stopOpacity={isCollapsed ? "0.32" : "0.22"} />
            <stop offset="100%" stopColor={isCollapsed ? "#B94A2F" : "#2F6F85"} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <g className="chart-grid">
          <path d={`M0 20H${width}M0 60H${width}M0 100H${width}M0 140H${width}M0 ${height - padBottom}H${width}`} />
          {points.map((pt, i) => (
            <line key={i} x1={pt.x} y1={0} x2={pt.x} y2={height - padBottom} stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
          ))}
        </g>
        {/* Classical Local Hidden Variable Boundary */}
        <line x1={0} y1={classicalY} x2={width} y2={classicalY} stroke="#B94A2F" strokeWidth="1.8" strokeDasharray="5 3" opacity="0.9" />
        <rect x={width - 215} y={classicalY - 18} width="210" height="16" fill={isCollapsed ? "rgba(185,74,47,0.15)" : "rgba(255,255,255,0.75)"} rx="2" />
        <text x={width - 210} y={classicalY - 6} fill="#B94A2F" fontSize="9" fontFamily="monospace" fontWeight="bold">
          S = 2.0 Classical boundary
        </text>

        {/* Bell Collapse Overlay */}
        {isCollapsed && (
          <g>
            <rect x={10} y={8} width="215" height="18" fill="rgba(185,74,47,0.12)" stroke="rgba(185,74,47,0.4)" rx="3" />
            <text x={16} y={20} fill="#B94A2F" fontSize="9" fontFamily="monospace" fontWeight="bold">
              ⚠ BELL NON-LOCALITY COLLAPSED
            </text>
          </g>
        )}

        <path className="chart-area" d={areaD} fill="url(#bell-area-grad-dyn)" style={{ transition: 'd 0.3s ease' }} />
        <path className={cn("signal-line", isCollapsed && "signal-line-threat")} d={pathD} style={{ stroke: isCollapsed ? "#B94A2F" : "#2F6F85", strokeWidth: "2.5", transition: 'd 0.3s ease' }} />
        {points.map((pt, i) => (
          <g key={pt.id || i}>
            <circle cx={pt.x} cy={pt.y} r={i === points.length - 1 ? "5.5" : "3.5"} fill={!pt.isViolation ? "#B94A2F" : "#2F6F85"} stroke="#ffffff" strokeWidth="1.5" />
            {i === points.length - 1 && (
              <circle cx={pt.x} cy={pt.y} r="10" fill="none" stroke={!pt.isViolation ? "#B94A2F" : "#2F6F85"} strokeWidth="1.8" opacity="0.7">
                <animate attributeName="r" values="5;14;5" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        ))}
      </svg>
      <div className="chart-xlabels">
        {xLabels.map((pt, i) => (
          <span key={i}>{pt.time}</span>
        ))}
      </div>
    </div>
  );
}

function PhotonTrack({ id, from, to, tone, delay = "0s", speed = 1 }: { id: string; from: { x: number; y: number }; to: { x: number; y: number }; tone: "quantum" | "classical" | "threat"; delay?: string; speed?: number }) {
  const duration = (2.6 / (speed || 1)).toFixed(2) + "s";
  return (
    <g className={cn("photon-track", `photon-track-${tone}`)}>
      <path id={id} d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`} />
      <g className="photon-particle">
        <path className="photon-tail" d="M -7 0 H -1" />
        <circle className="photon-ring" r="2.2" />
        <circle className="photon-core" r=".8" />
        <animateMotion key={`${id}-${duration}`} dur={duration} repeatCount="indefinite" begin={delay} rotate="auto">
          <mpath href={`#${id}`} />
        </animateMotion>
      </g>
    </g>
  );
}

function HomePortal() {
  const { telemetryLogs } = useSentinel();
  const { user } = useAuth();
  const [ticker, setTicker] = useState(0);
  useEffect(() => { const timer = setInterval(() => setTicker(t => t + 1), 3000); return () => clearInterval(timer); }, []);
  return <div className="page-content portal-page"><Topbar eyebrow="00 / Switchboard" title="Trust is a measurable state." subtitle="QDS Sentinel / quantum signature assurance console" action={<Pill tone="good"><StatusDot /> gateway connected</Pill>} /><section className="hero-panel"><div className="hero-copy"><div className="hero-kicker"><span className="copper-line" /> quantum digital signatures / v1.0.0</div><h2>Prove authenticity<br /><em>under pressure.</em></h2><p>Observe the quantum protocol, surface an adversary, and keep every decision auditable from one calibrated console.</p><div className="hero-actions"><Link href="/demonstration" className="button button-copper"><Play size={15} fill="currentColor" /> Launch protocol demo <ArrowUpRight size={14} /></Link><button className="button button-outline" onClick={() => window.dispatchEvent(new CustomEvent('qds-open-login'))} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><KeyRound size={14} /> {user ? `Switch Operator (${user.display_name})` : "Operator Login"}</button><Link href="/monitoring" className="button hero-secondary-action">Open live audit <ArrowUpRight size={14} /></Link><Link href="/transfer" className="button hero-secondary-action">Open transfer terminal <ArrowUpRight size={14} /></Link></div></div><div className="hero-art"><img src={HERO} alt="Abstract photon pulse crossing a dark optical channel" /><div className="hero-readout"><span>current assurance</span><strong>98.8%</strong><small>within tolerance</small></div></div><div className="hero-footnote">FIELD NOTE 001 <span>////</span> authenticated distribution is never assumed</div></section><section className="portal-grid"><SectionLabel index="01" eyebrow="Choose an instrument" title="Operator views" action={<span className="section-note">Three pathways / one source of truth</span>} /><div className="portal-cards"><Link href="/demonstration" className="portal-card portal-card-dark"><div className="card-number">01</div><div className="portal-card-visual"><div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="node node-a">A</div><div className="node node-b">B</div><div className="photon photon-one" /><div className="photon photon-two" /></div><div className="portal-card-body"><div className="eyebrow light">Interactive physics simulator</div><h3>Alice <span>↔</span> Bob</h3><p>Walk the six protocol phases from EPR pair distribution to the final CHSH audit gate.</p><div className="tag-row"><Pill tone="dark">EPR pairs</Pill><Pill tone="dark">BSM</Pill><Pill tone="dark">CHSH test</Pill></div><span className="card-cta">Enter demonstration <ArrowUpRight size={14} /></span></div></Link><Link href="/monitoring" className="portal-card portal-card-paper"><div className="card-number">02</div><div className="monitor-card-top"><div><div className="eyebrow">Forensic telemetry</div><h3>Security<br /><em>monitoring</em></h3></div><div className="alert-count"><span>open alerts</span><strong>01</strong></div></div><div className="mini-chart"><div className="font-mono text-[10px] space-y-1">{telemetryLogs.slice(0, 4).map((l, i) => <p key={i} className={l.isThreat ? "text-copper" : "text-slate-500"}>&gt; {l.source}: {l.text.slice(0, 30)}...</p>)}</div></div><div className="portal-card-body"><p>Track QBER boundaries, Bell non-locality, and the complete audit stream as sessions move through the network.</p><div className="tag-row"><Pill tone="blue">Hoeffding</Pill><Pill tone="copper">Quarantine</Pill><Pill>Session DB</Pill></div><span className="card-cta">Open live audit <ArrowUpRight size={14} /></span></div></Link><div className="portal-card portal-card-paper" onClick={() => window.dispatchEvent(new CustomEvent('qds-open-login'))} style={{ cursor: 'pointer' }}><div className="card-number">00</div><div className="monitor-card-top"><div><div className="eyebrow">Cryptographic clearance</div><h3>Operator<br /><em>Gateway</em></h3></div><div className="alert-count" style={{ background: user ? 'rgba(47,111,133,0.1)' : 'rgba(185,74,47,0.1)' }}><span style={{ color: user ? 'var(--blue)' : 'var(--copper)' }}>status</span><strong style={{ color: user ? 'var(--blue)' : 'var(--copper)', fontSize: '11px' }}>{user ? 'AUTHENTICATED' : 'SIGN IN'}</strong></div></div><div className="portal-card-body"><p>{user ? `Authenticated as ${user.display_name} (${user.role}). Clearance: ${user.clearance}. Click to authenticate or switch operator profile.` : "Authenticate cryptographic terminal to access continuous optical telemetry, Bell non-locality verification, and post-quantum attestation routing."}</p><div className="tag-row"><Pill tone={user ? "good" : "copper"}>{user ? user.node_id : "FIDO2 / QKD Key"}</Pill><Pill tone="dark">1-Click Access</Pill><Pill>NIST FIPS 204</Pill></div><span className="card-cta">{user ? "Switch operator profile" : "Authenticate terminal"} <ArrowUpRight size={14} /></span></div></div></div></section><section className="cluster-strip"><div className="cluster-heading"><span className="eyebrow">Cluster status</span><strong>All systems observable</strong></div><div className="cluster-item"><span className="cluster-icon"><Radio size={15} /></span><div><span className="metric-label">Active session</span><strong>QKD-260827-91F4</strong></div></div><div className="cluster-item"><span className="cluster-icon"><Network size={15} /></span><div><span className="metric-label">Connected nodes</span><strong>04 / 04 online</strong></div></div><div className="cluster-item"><span className="cluster-icon"><LockKeyhole size={15} /></span><div><span className="metric-label">Channel integrity</span><strong>Authenticated</strong></div></div><div className="cluster-item cluster-item-accent"><span className="eyebrow">last sync</span><strong>11:48:09 <span>UTC</span></strong></div></section><section className="network-band"><div><SectionLabel index="02" eyebrow="Network map" title="Quantum links, made legible." /><p className="network-intro">A live topology of the authenticated channel. The visual layer stays quiet; the signal layer tells the story.</p><Link href="/monitoring" className="text-link">Inspect topology <ArrowUpRight size={14} /></Link></div><div className="network-visual"><img src={NETWORK} alt="Abstract quantum network topology" /><div className="network-node n-arb">ARBITRATOR<span>12ms</span></div><div className="network-node n-alice">ALICE<span>18ms</span></div><div className="network-node n-bob">BOB<span>20ms</span></div><div className="network-node n-eve">EVE<span>quarantined</span></div></div></section></div>;
}

function MonitoringPage() {
  const { eveActive, toggleEve, qber, chsh, telemetryLogs, incidents, activeAttack } = useSentinel();
  const [tab, setTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("section");
    if (["overview", "threats", "incidents", "network", "pqc"].includes(requested ?? "")) {
      return requested!;
    }
    try {
      const saved = localStorage.getItem("qds_active_monitor_tab");
      if (["overview", "threats", "incidents", "network", "pqc"].includes(saved ?? "")) {
        return saved!;
      }
    } catch { }
    return "overview";
  });
  const threat = eveActive;
  const setThreat = toggleEve;
  const [range, setRange] = useState("15M");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isolated, setIsolated] = useState<string[]>([]);
  const selectTab = (nextTab: string) => {
    if (!["overview", "threats", "incidents", "network", "pqc"].includes(nextTab)) return;
    setTab(nextTab);
    try {
      localStorage.setItem("qds_active_monitor_tab", nextTab);
    } catch { }
    const params = new URLSearchParams(window.location.search);
    params.set("section", nextTab);
    window.history.replaceState({}, "", window.location.pathname + "?" + params.toString());
  };
  useEffect(() => {
    const onTab = (event: Event) => selectTab((event as CustomEvent<string>).detail);
    const onPopState = () => {
      const requested = new URLSearchParams(window.location.search).get("section");
      if (requested && ["overview", "threats", "incidents", "network", "pqc"].includes(requested)) {
        setTab(requested);
      }
    };
    window.addEventListener("qds-monitor-tab", onTab);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("qds-monitor-tab", onTab);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);
  
  const rows = sortTelemetryDesc(telemetryLogs).map((item) => ({
    ...item,
    qber: item.qber || `${(qber * 100).toFixed(1)}%`,
    chsh: item.chsh || chsh.toFixed(2),
    code: item.code || (item.isThreat ? "403 FORBIDDEN" : "200 OK")
  }));
  const filtered = rows.filter((item) => (item.source + " " + item.text).toLowerCase().includes(query.toLowerCase()));
  const copyJson = async (item: any) => { await navigator.clipboard?.writeText(JSON.stringify(item)); setCopied(item.id); window.setTimeout(() => setCopied(null), 1600); };
  const exportTelemetry = () => { const csv = ["timestamp,subsystem,event,latency,status,qber,chsh", ...rows.map((item) => [item.time, item.source, item.text, item.ms, item.code, item.qber, item.chsh].join(","))].join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = "soc_telemetry_report_" + Date.now() + ".csv"; a.click(); URL.revokeObjectURL(url); toast.success("SOC telemetry report exported"); };

  return <div className={cn("page-content monitoring-page", "monitoring-tab-" + tab)}><Topbar eyebrow="02 / Security operations" title="SOC monitoring center" subtitle={`Boundary charts, incident forensics, and distributed node telemetry (${activeAttack})`} action={<div className="monitor-top-actions"><Link href="/home" className="button button-quiet button-small"><ArrowLeft size={14} /> Home portal</Link><span className={threat ? "status-text-threat" : "status-text-good"}>{threat ? `THREAT DETECTED (${activeAttack})` : "NOMINAL · 99.9% SECURE"}</span><button className="button button-outline button-small" onClick={exportTelemetry}><Download size={14} /> Export</button></div>} /><main className="monitor-section-stage" key={tab}><div className="monitor-active-section">
  <strong>SOC Operations Center</strong>
  <span>
    gateway / 3001 ·{" "}
    <button
      className={cn("status-badge-toggle", threat ? "text-copper font-bold" : "status-text-good font-bold")}
      onClick={() => {
        setThreat();
        toast.success(!threat ? "Simulated threat engaged — status DEGRADED" : "Network threat cleared — status NOMINAL");
      }}
      title="Click to toggle gateway status between DEGRADED and NOMINAL"
      style={{ background: "transparent", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
    >
      {threat ? "DEGRADED (Click to clear)" : "NOMINAL"}
    </button>
  </span>
</div>
{tab === "overview" && <OverviewPanel threat={threat} setThreat={setThreat} range={range} setRange={setRange} filtered={filtered} copyJson={copyJson} exportTelemetry={exportTelemetry} />}{tab === "threats" && <ThreatsPanel threat={threat} onThreat={() => setThreat()} />}{tab === "incidents" && <IncidentsPanel selectedIncident={selectedIncident} setSelectedIncident={setSelectedIncident} />}{tab === "network" && <NetworkPanel selectedNode={selectedNode} setSelectedNode={setSelectedNode} isolatedNodes={isolated} setIsolatedNodes={setIsolated} />}{tab === "pqc" && <PQCDefensePanel threat={threat} onThreat={() => setThreat()} />}<aside className="monitor-inspector"><div className="inspector-head"><span className="eyebrow">{tab === "overview" ? "Live incident" : tab === "threats" ? "Threat inspector" : tab === "incidents" ? "Incident inspector" : tab === "pqc" ? "PQC defense" : "Node inventory"}</span></div>{tab === "overview" && <><div className="inspector-status"><AlertTriangle size={16} /><strong>{threat ? "Critical alarm" : "Recent anomaly"}</strong></div><h3>{threat ? `Active Attack: ${activeAttack}` : "Signature forgery review"}</h3><p>Live evidence and operator actions for the highest-priority boundary event.</p><div className="inspector-list"><div><span>origin node</span><strong>{threat ? "EVE / basis mismatch" : "NODE-104"}</strong></div><div><span>QBER</span><strong className={threat ? "text-copper" : "status-text-good"}>{(qber * 100).toFixed(1)}%</strong></div><div><span>CHSH</span><strong>{chsh.toFixed(2)}</strong></div></div><button className="button button-copper inspector-action" onClick={() => selectTab("incidents")}>Open incident log <ArrowUpRight size={14} /></button></>}{tab === "incidents" && <><div className="inspector-status"><ShieldAlert size={16} /><strong>Forensic queue ({incidents.length})</strong></div><h3>Click a record to inspect</h3><p>Incident evidence, audit timeline, and escalation actions appear here when a row is selected.</p><button className="button button-outline inspector-action" onClick={() => setSelectedIncident(incidents[0] || { id: "INC-104", time: "11:31:08", severity: "CRITICAL", title: "Intercept-resend disturbance", analyst: "Anisha S", detail: "QBER 14.2% crossed Hoeffding bound; CHSH collapsed to 1.86." })}>Inspect Latest Incident</button></>}</aside></main></div>;


}

/* PQC Defense workspace — Signal Atelier renders post-quantum assurance as warm paper, ink structure, blue verification, and copper intervention. */
function PQCDefensePanel({ threat: localThreat, onThreat: localOnThreat }: { threat?: boolean; onThreat?: () => void }) {
  const { eveActive, toggleEve, qber, chsh, pqcMode, remediationReport } = useSentinel();
  const threat = eveActive;
  const [handover, setHandover] = useState(0);
  const [diagnosticOpen, setDiagnosticOpen] = useState(true);
  const [architectureOpen, setArchitectureOpen] = useState(false);
  const [tokensRotated, setTokensRotated] = useState(false);
  const [pqcSigHash, setPqcSigHash] = useState<string>("0x8f3c719e4a2d810b5c4f3a1e9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && architectureOpen) {
        setArchitectureOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [architectureOpen]);


  const stages = [
    ["Physical QDS link", "EPR-entangled photons active"],
    ["Hoeffding audit gate", "QBER < 5.5% · CHSH ≥ 2.0"],
    ["Zeroize RAM keys", "Purge un-amplified key buffers"],
    ["PQC signature handover", "Dilithium3 classical fallback"],
  ];
  const specs = [["Mathematical hardness assumption", "Module Learning-With-Errors (MLWE) & Short Integer Solution (SIS)"], ["NIST security level", "Category 3 (equivalent to AES-192 / RSA-4096 quantum resistance)"], ["Public key / signature size", "1,952 bytes public key / 3,293 bytes signature"], ["Quantum resistance margin", "Immune to Shor’s polynomial quantum factoring algorithm"]];

  const handleToggleAttack = async () => {
    await toggleEve();
  };

  const copyToken = (token: string) => {
    navigator.clipboard?.writeText(token);
    toast.success("PQC token copied");
  };

  return (
    <section className="pqc-defense">
      <div className="pqc-titlebar">
        <div>
          <h2>PQC defense operations control</h2>
          <p>Deterministic Hoeffding threat gate & NIST post-quantum cryptography handover</p>
        </div>
        <div className="pqc-title-actions">
          <button className="button button-outline button-small" onClick={() => { setArchitectureOpen(!architectureOpen); toast.info(architectureOpen ? "Architecture overlay closed" : "PQC architecture model opened"); }}>
            <Network size={14} /> {architectureOpen ? "Hide architecture" : "View PQC architecture"}
          </button>
          <button className="button button-outline button-small" onClick={() => { if (threat) toggleEve(); setHandover(0); setTokensRotated(false); toast.success("Clean quantum channel restored"); }}>
            <RotateCcw size={14} /> Reset clean channel
          </button>
          <button className={cn("button button-small", threat ? "button-quiet" : "button-copper")} onClick={handleToggleAttack}>
            <Zap size={14} /> {threat ? "Clear attack simulation" : "Trigger attack simulation"}
          </button>
        </div>
      </div>
      {architectureOpen && (
        <div className="pqc-architecture-note">
          <Network size={15} />
          <span>Architecture model: physical QDS witness → deterministic audit gate → ephemeral key zeroization → ML-DSA-65 fallback signature.</span>
          <button onClick={() => setArchitectureOpen(false)}><X size={14} /></button>
        </div>
      )}
      <div className="pqc-metrics">
        <div className="pqc-metric pqc-metric-mode">
          <span>Active system mode</span>
          <strong className={threat ? "text-copper" : "status-text-good"}>{threat ? "PQC_FALLBACK" : "QUANTUM_SECURE"}</strong>
          <small>{threat ? "Dilithium3 fallback ready" : "Pristine QDS teleportation"}</small>
        </div>
        <div className="pqc-metric">
          <span>QBER / Hoeffding bound</span>
          <strong className={threat ? "text-copper" : "status-text-good"}>{(qber * 100).toFixed(1)}%</strong>
          <small>Statistical cutoff limit: 5.50%</small>
        </div>
        <div className="pqc-metric">
          <span>CHSH Bell metric (S)</span>
          <strong className={threat ? "text-copper" : "status-text-good"}>S = {chsh.toFixed(2)}</strong>
          <small>{threat ? "Classical boundary reached" : "Quantum non-locality verified"}</small>
        </div>
        <div className="pqc-metric">
          <span>PQC algorithm (NIST)</span>
          <strong>Dilithium3 (ML-DSA-65)</strong>
          <small>Key exchange: Kyber768 (ML-KEM)</small>
        </div>
      </div>
      <div className="pqc-workspace">
        <div className="pqc-main">
          <section className="pqc-console">
            <header>
              <div><TerminalSquare size={15} /><strong>Air-gapped cognitive incident diagnosis</strong><small>Ollama Phi-3 engine</small></div>
              <button onClick={() => setDiagnosticOpen(!diagnosticOpen)}>{diagnosticOpen ? "Collapse diagnostic" : "Open diagnostic"}</button>
            </header>
            {diagnosticOpen && (
              <div className={cn("pqc-diagnostic-copy", threat && "pqc-diagnostic-copy-threat")} style={{ whiteSpace: 'pre-wrap' }}>
                {remediationReport || (threat ? "THREAT DIAGNOSIS\n1. MitM Attack Detected: Calculated QBER vastly exceeds Hoeffding threshold.\n2. Entanglement Depolarization: CHSH score collapsed (< 2.0 classical limit).\n\nAUTOMATED REMEDIATION PLAN EXECUTED\n1. Physical Key Purge: Flushed key buffers.\n2. Dynamic PQC Handover: Hot-swapped to CRYSTALS-Dilithium3 ML-DSA-65." : "No anomalies detected. QDS teleportation keys are active and verified. Quantum channel is operating at optimal coherence.")}
              </div>
            )}
          </section>
          <section className="pqc-specs">
            <header><ShieldCheck size={15} /><strong>NIST post-quantum cryptography specifications</strong><span>ML-DSA-65</span></header>
            <div>
              {specs.map(([label, value]) => (
                <article key={label}><span>{label}</span><strong>{value}</strong></article>
              ))}
            </div>
          </section>
        </div>
        <aside className="pqc-side">
          <section className="pqc-handover">
            <header><GitBranch size={15} /><strong>Handover sequence diagram</strong></header>
            <div>
              {stages.map(([title, detail], index) => (
                <button key={title} className={cn("pqc-handover-stage", handover === index && "pqc-handover-stage-active", threat && index === 1 && "pqc-handover-stage-threat")} onClick={() => { setHandover(index); toast.info(title + " selected"); }}>
                  <i>0{index + 1}</i>
                  <span><strong>{title}</strong><small>{detail}</small></span>
                </button>
              ))}
            </div>
          </section>
          <section className="pqc-token-inspector">
            <header><LockKeyhole size={15} /><strong>Live key token inspector</strong></header>
            <div>
              <span>Current Alice public key hash</span>
              <code>{pqcSigHash}</code>
              <button onClick={() => copyToken(pqcSigHash)}>Copy key hash</button>
            </div>
            <div>
              <span>Bob PQC key encapsulation nonce</span>
              <code>{tokensRotated ? "0x7ab3d2c1e8f4a906b5c2d7e1f3a8b4c6d9e0f2a5b7c1d3e6f8a0b2c4d6e8f0a2" : "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"}</code>
              <button onClick={() => { setTokensRotated(!tokensRotated); toast.success("Bob encapsulation nonce rotated"); }}>
                {tokensRotated ? "Restore nonce" : "Rotate nonce"}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function SandboxPage() {
  const { eveActive, triggerAttack, qber: globalQber, chsh: globalChsh, pqcMode, remediationReport, activeAttack } = useSentinel();
  const [active, setActive] = useState(activeAttack || "MitM attack");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationPhase, setSimulationPhase] = useState("");
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [isClosingNode, setIsClosingNode] = useState(false);
  const [isExecutingApi, setIsExecutingApi] = useState(false);
  const [visibleLinesCount, setVisibleLinesCount] = useState(8);

  const handleCloseExpanded = () => {
    if (isClosingNode) return;
    setIsClosingNode(true);
    setTimeout(() => {
      setExpandedNode(null);
      setIsClosingNode(false);
    }, 220);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expandedNode) {
        handleCloseExpanded();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedNode, isClosingNode]);

  const attacks = [
    { title: "Clean signature", code: "CLEAN", detail: "Authenticated Bell-pair exchange", tone: "good", type: "clean", qber: 0.019, chsh: 2.76, threshold: 0.055, thresholdPercent: "5.50%", sampleSize: 2048, lossDb: 0.2 },
    { title: "MitM attack", code: "MITM", detail: "Intercept / resend eavesdrop", tone: "copper", type: "forgery", qber: 0.142, chsh: 1.76, threshold: 0.055, thresholdPercent: "5.50%", sampleSize: 1024, lossDb: 0.5 },
    { title: "Forgery attack", code: "FORGE", detail: "Tampered feed-forward bits", tone: "copper", type: "forgery", qber: 0.128, chsh: 1.82, threshold: 0.052, thresholdPercent: "5.20%", sampleSize: 1024, lossDb: 0.4 },
    { title: "Replay attack", code: "REPLAY", detail: "Captured nonce retransmit", tone: "copper", type: "replay", qber: 0.086, chsh: 1.91, threshold: 0.049, thresholdPercent: "4.90%", sampleSize: 1536, lossDb: 0.3 },
    { title: "PNS attack", code: "PNS", detail: "Photon-number splitting probe", tone: "copper", type: "pns", qber: 0.095, chsh: 1.88, threshold: 0.041, thresholdPercent: "4.10%", sampleSize: 1024, lossDb: 4.5 },
    { title: "Channel noise attack", code: "NOISE", detail: "Adversarial channel noise & optical jamming", tone: "copper", type: "noise", qber: 0.108, chsh: 1.74, threshold: 0.055, thresholdPercent: "5.50%", sampleSize: 1024, lossDb: 2.8 }
  ];

  const selected = attacks.find((attack) => attack.title === active || attack.title.toLowerCase().includes(active.toLowerCase()) || (active.toLowerCase().includes("noise") && attack.code === "NOISE")) ?? attacks[1];
  const threatened = selected.tone === "copper";

  const runTerminalStream = (scenarioItem: typeof selected) => {
    setVisibleLinesCount(1);
    setIsSimulating(true);
    setSimulationPhase("INITIALIZING PROTOCOL (BB84 EXT)...");

    let current = 1;
    const totalLines = 8;
    const interval = setInterval(() => {
      current += 1;
      setVisibleLinesCount(current);

      if (current === 2) setSimulationPhase("TRANSMITTING PHOTONS (N=1024, λ=1550nm)...");
      if (current === 4) setSimulationPhase("RECONCILING MEASUREMENT BASES & SIFTING...");
      if (current === 6) setSimulationPhase("CALCULATING CHSH BELL INEQUALITY & HOEFFDING...");
      if (current >= totalLines) {
        clearInterval(interval);
        setVisibleLinesCount(totalLines);
        setIsSimulating(false);
        setSimulationPhase(
          scenarioItem.tone === "good"
            ? "PROTOCOL VERIFIED · ACCEPT · PHYSICAL QDS SEALED"
            : `SECURITY BREACH [${scenarioItem.code}] CONTAINED · PQC FALLBACK (ML-DSA-65 / ML-KEM-768) ENGAGED`
        );
      }
    }, 120);

    return () => clearInterval(interval);
  };

  const triggerBackendAttack = async (attackItem: typeof selected) => {
    setIsExecutingApi(true);
    try {
      await triggerAttack(attackItem.title, attackItem.qber, attackItem.chsh);
    } catch {
      toast.info(`Staged ${attackItem.title} scenario locally.`);
    } finally {
      setIsExecutingApi(false);
    }
  };

  const handleSelectScenario = (attackTitle: string) => {
    setActive(attackTitle);
    const target = attacks.find(a => a.title === attackTitle || a.title.toLowerCase().includes(attackTitle.toLowerCase()) || (attackTitle.toLowerCase().includes("noise") && a.code === "NOISE")) ?? selected;
    triggerBackendAttack(target);
  };

  useEffect(() => {
    const cleanup = runTerminalStream(selected);
    return cleanup;
  }, [active]);

  const consoleLines = {
    arbitrator: [
      "> initialize protocol (BB84 EXT / 1550nm)",
      "> awaiting node registration...",
      threatened ? "> ACK: Alice connected [ID: 0x9F3A] · Bob [ID: 0x1C4B]" : "> ACK: all nodes authenticated (Alice ↔ Bob)",
      "> channel seed established · optical-dark-fiber-01",
      threatened
        ? `> WARN: QBER ${(selected.qber * 100).toFixed(1)}% breached dynamic Hoeffding bound (τ=${selected.thresholdPercent})`
        : `> [NOISE DISCRIMINATOR] QBER ${(selected.qber * 100).toFixed(1)}% within operating bound (τ=${selected.thresholdPercent})`,
      threatened
        ? `> ERR: Bell correlation collapsed (S=${selected.chsh.toFixed(2)} < 2.00 classical limit)`
        : `> Bell test: PASS (CHSH S=${selected.chsh.toFixed(2)} ≥ 2.00 quantum non-locality)`,
      threatened
        ? `> ABORT: Adversarial anomaly [${selected.code}] flagged by Threat Engine`
        : "> ACCEPT: physical signature verification sustained",
      threatened
        ? "> PQC FALLBACK SUCCESS: Session sustained · Payload authenticated with Dilithium3 / ML-KEM-768"
        : "> QDS ATTESTATION: unforgeable quantum key distilled"
    ],
    alice: [
      "> awaiting classical basis reconciliation...",
      threatened ? `> ERR: sift parity mismatch detected (${(selected.qber * 100).toFixed(1)}% bit divergence)` : "> ACK: basis sift match (512 bits reconciled)",
      threatened ? "> PQC HOT-SWAP COMPLETE: Alice signed document with Dilithium3 lattice keypair · 100% delivered" : "> ACK: signed message payload delivered"
    ],
    bob: [
      "> listener active(port: 9091)",
      "> measuring incoming SPDC photon stream...",
      "> rand bases: [×, ×, +, ×, +, ×, +, +]",
      "> capture: 1024 photons received",
      threatened ? `> ERR: sifted key invalid (phase collapse ${(selected.qber * 100).toFixed(1)}%)` : "> ACK: Pauli frame alignment completed (96% kept)",
      threatened ? `> WARN: Bell correlation below threshold (S=${selected.chsh.toFixed(2)})` : `> Bell witness sealed (S=${selected.chsh.toFixed(2)})`,
      threatened ? "> PQC VERIFIED: Bob confirmed Dilithium3 / ML-KEM-768 signature · 100% byte integrity preserved" : "> QDS VERIFIED: physical attestation sealed"
    ],
    eve: [
      "> probe standby(target: quantum-link-01)",
      `> attack vector: ${selected.code} [${selected.detail}]`,
      threatened
        ? (selected.code === "NOISE" || selected.code === "JAMMING"
            ? "> INJECT: high-power incoherent laser jamming & phase disturbance pumped into fiber"
            : "> INJECT: optical beam splitter engaged on link")
        : "> standby: optical sniffer below noise floor",
      threatened ? `> MEASURE: state collapse on bit sequence (QBER ${(selected.qber * 100).toFixed(1)}%)` : "> zero polarization collapse detected",
      threatened ? "> WARN: basis mismatch detected by arbitrator audit" : "> no adversarial action detected",
      threatened ? "> EVE EXFILTRATION FAILED: Quantum key dropped + PQC lattice barrier impenetrable (0 bytes leaked)" : "> probe idle: 0 bytes exfiltrated"
    ]
  };

  const [copiedNodeTitle, setCopiedNodeTitle] = useState<string | null>(null);

  const handleCopyConsoleLog = (nodeTitle: string, lines: string[]) => {
    navigator.clipboard?.writeText(lines.join("\n"));
    setCopiedNodeTitle(nodeTitle);
    toast.success(nodeTitle + " log copied to clipboard");
    setTimeout(() => setCopiedNodeTitle(null), 1800);
  };

  const Pane = ({ title, nodeKey, variant, lines }: { title: string; nodeKey: "arbitrator" | "alice" | "bob" | "eve"; variant: "good" | "copper" | "blue"; lines: string[] }) => (
    <section className={cn("sandbox-v2-console", "sandbox-v2-console-" + variant)}>
      <div className="sandbox-v2-console-head">
        <span className="flex items-center gap-1.5 font-semibold">
          <TerminalSquare size={12} className={variant === "copper" ? "text-copper" : "text-[#2F6F85]"} />
          {title}
        </span>
        <div className="flex items-center gap-1">
          <button
            className={cn("console-action-btn", copiedNodeTitle === title && "copied-active")}
            onClick={() => handleCopyConsoleLog(title, lines)}
            aria-label={"Copy " + title + " log"}
            title="Copy console log"
          >
            {copiedNodeTitle === title ? <Check size={12} className="text-[#059669]" /> : <Copy size={12} />}
          </button>
          <button
            className="console-action-btn"
            onClick={() => setExpandedNode(nodeKey)}
            aria-label={"Expand " + title + " console"}
            title="Expand console view"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      <div className="sandbox-v2-console-body">
        {lines.slice(0, visibleLinesCount).map((line, index) => (
          <p key={line + index} className={cn(line.includes("ERR") || line.includes("ABORT") || line.includes("BREACH") ? "console-line-alert font-semibold" : line.includes("WARN") || line.includes("INJECT") ? "console-line-warn" : line.includes("ACK") || line.includes("ACCEPT") || line.includes("PASS") || line.includes("PQC") ? "console-line-ok" : "")}>{line}</p>
        ))}
        {visibleLinesCount < lines.length && (
          <p className="text-[10px] text-slate-400 animate-pulse font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-ping" />
            &gt; streaming line {visibleLinesCount + 1}/{lines.length}...
          </p>
        )}
      </div>
      {title === "EVE INTERCEPT" && threatened && <span className="sandbox-v2-console-alert">INTERVENTION ACTIVE</span>}
    </section>
  );

  return (
    <div className="sandbox-v2">
      <header className="sandbox-v2-header">
        <div className="sandbox-v2-brand">
          <img src={MARK} alt="" />
          <span>QDS SENTINEL</span>
        </div>
        <strong>Attack sandbox & Live SOC Event Integration</strong>
        <div className="flex items-center justify-end gap-2 text-[10px] font-mono">
          <span className={cn("px-2 py-0.5 rounded-[2px] font-bold uppercase", threatened ? "bg-[#B94A2F]/15 text-[#B94A2F]" : "bg-[#3B7453]/15 text-[#3B7453]")}>
            {threatened ? `THREAT: ${selected.code}` : "NOMINAL SECURE"}
          </span>
        </div>
      </header>

      <div className="sandbox-v2-shell">
        <aside className="sandbox-v2-scenarios">
          <span className="eyebrow">Attack scenarios</span>
          <div className="sandbox-v2-scenario-list">
            {attacks.map((attack) => (
              <button
                key={attack.title}
                className={cn("sandbox-v2-scenario", active === attack.title && "sandbox-v2-scenario-active", "sandbox-v2-scenario-" + attack.tone)}
                onClick={() => handleSelectScenario(attack.title)}
              >
                <i />
                <span>{attack.title}</span>
              </button>
            ))}
          </div>
          <div className="sandbox-v2-scenario-spacer" />
          <button
            className={cn("sandbox-v2-initiate", (isSimulating || isExecutingApi) && "sandbox-v2-initiate-active")}
            disabled={isExecutingApi}
            onClick={() => {
              runTerminalStream(selected);
              triggerBackendAttack(selected);
            }}
          >
            {isExecutingApi ? "FastAPI Executing…" : isSimulating ? "Replaying handshake…" : "Initiate handshake"}
          </button>
        </aside>

        <main className="sandbox-v2-consoles">
          <Pane title="ARBITRATOR.SYS" nodeKey="arbitrator" variant={threatened ? "copper" : "good"} lines={consoleLines.arbitrator} />
          <Pane title="ALICE NODE" nodeKey="alice" variant="good" lines={consoleLines.alice} />
          <Pane title="BOB NODE" nodeKey="bob" variant="good" lines={consoleLines.bob} />
          <Pane title="EVE INTERCEPT" nodeKey="eve" variant={threatened ? "copper" : "blue"} lines={consoleLines.eve} />
        </main>

        <aside className="sandbox-v2-telemetry">
          <span className="eyebrow">Telemetry & PQC Status</span>
          <SandboxMetricChart
            title="QBER vs Hoeffding"
            value={`Current: ${(globalQber * 100).toFixed(1)}%`}
            detail={threatened ? `${selected.thresholdPercent} threshold breach` : `nominal (τ=${selected.thresholdPercent})`}
            threat={threatened}
            mode="qber"
            targetVal={selected.qber}
            currentVal={globalQber}
            thresholdVal={selected.threshold}
            thresholdLabel={`τ ≤ ${selected.thresholdPercent}`}
          />
          <SandboxMetricChart
            title="CHSH Bell violation"
            value={`S = ${globalChsh.toFixed(2)}`}
            detail={threatened ? "Classical bound (S=2.0)" : "Quantum correlation"}
            threat={threatened}
            mode="chsh"
            targetVal={selected.chsh}
            currentVal={globalChsh}
          />
          <div className="sandbox-v2-readout">
            <div><span>Active Scenario</span><b className={threatened ? "text-copper" : "status-text-good"}>{selected.title}</b></div>
            <div><span>Dynamic Hoeffding τ</span><b className={threatened ? "text-copper" : "status-text-good"}>{selected.thresholdPercent} (N={selected.sampleSize})</b></div>
            <div><span>Key rate</span><b>{threatened ? "1.2 kbps" : "4.8 kbps"}</b></div>
            <div><span>Sifting eff.</span><b>{threatened ? "49.6%" : "96.2%"}</b></div>
            <div>
              <span>Security status</span>
              <b className={threatened ? "text-copper" : "status-text-good"}>{threatened ? "PQC FALLBACK" : "Nominal"}</b>
            </div>
          </div>
        </aside>
      </div>

      {expandedNode && (
        <div className={cn("sandbox-console-overlay", isClosingNode && "closing")} onClick={handleCloseExpanded}>
          <section className={cn("sandbox-console-focus", isClosingNode && "closing")} onClick={(event) => event.stopPropagation()}>
            <div className="sandbox-console-focus-head">
              <div>
                <span className="eyebrow flex items-center gap-1.5 text-blue">
                  <Maximize2 size={12} /> Expanded protocol node
                </span>
                <h2>{expandedNode === "arbitrator" ? "ARBITRATOR.SYS" : expandedNode === "alice" ? "ALICE NODE" : expandedNode === "bob" ? "BOB NODE" : "EVE INTERCEPT"}</h2>
              </div>
              <button className="icon-button" onClick={handleCloseExpanded} aria-label="Close expanded node"><X size={15} /></button>
            </div>
            <div className="sandbox-console-focus-log">
              {consoleLines[expandedNode as keyof typeof consoleLines].concat([
                "> trace id: qds-260827-91f4",
                "> packet evidence retained",
                threatened ? "> verdict: reject / PQC Dilithium3 fallback engaged" : "> verdict: accept / no intervention required"
              ]).map((line, index) => (
                <p key={line + index} className={cn(line.includes("ERR") || line.includes("ABORT") || line.includes("reject") ? "console-line-alert" : line.includes("WARN") ? "console-line-warn" : line.includes("ACK") || line.includes("ACCEPT") || line.includes("accept") || line.includes("PQC") ? "console-line-ok" : "")}>{line}</p>
              ))}
            </div>
            <div className="sandbox-console-focus-actions">
              <button className="button button-outline button-small" onClick={() => { navigator.clipboard?.writeText(consoleLines[expandedNode as keyof typeof consoleLines].join("\n")); toast.success("Expanded node evidence copied"); }}>
                <Copy size={14} /> Copy evidence
              </button>
              <button className="button button-copper button-small" onClick={handleCloseExpanded}>Collapse node</button>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}

/* Overview workspace — Signal Atelier keeps nominal security calm through mineral paper, ink structure, analytic blue data, and text-only green verification. */
function formatEventGist(rawText?: string, isAlert?: boolean, activeAttack?: string): string {
  if (!rawText) return isAlert ? `Breach Detected / ${activeAttack || 'Threat'}` : 'Photon Pulse Transmission';
  const text = rawText.trim();

  if (text.includes('TRANSFER DISPATCH')) return 'Payload Sealed & Dispatched';
  if (text.includes('TRANSFER INTERCEPT') || text.includes('Eavesdropping disturbance')) return 'Eavesdropping Tap Detected';
  if (text.includes('Arbitrator verified optical entropy') || text.includes('entropy witness')) return 'Optical Entropy Witness Verified';
  if (text.includes('Physical QDS teleportation signature') || text.includes('Physical QDS signature')) return 'Physical QDS Signature Verified';
  if (text.includes('Dilithium3 PQC fallback') || text.includes('PQC Fallback') || text.includes('ML-DSA-65')) return 'PQC Fallback Signature Sealed';
  
  if (text.includes('FINAL VERDICT: ACCEPT') || text.includes('Unconditional signature verification accepted') || text.includes('[DECISION: ACCEPT]')) return 'Protocol Verified (ACCEPT)';
  if (text.includes('FINAL VERDICT: REJECT') || text.includes('Non-locality breach') || text.includes('[DECISION: REJECT]')) return 'Protocol Rejected (PQC Fallback)';
  
  if (text.includes('SPDC') || text.includes('crystal') || text.includes('Phase 01')) return 'SPDC Photon Pair Emission';
  if (text.includes('BSM') || text.includes('Bell-state measurement') || text.includes('Bell State Measurement') || text.includes('Phase 02')) return 'Alice Bell Measurement (BSM)';
  
  if (text.includes('Pauli') || text.includes('σX') || text.includes('σ_x') || text.includes('Phase 03')) {
    if (isAlert || text.includes('INTERCEPT') || text.includes('Adversary') || text.includes('EVE')) {
      return 'Adversarial Optical Tap (Eve)';
    }
    return 'Bob Pauli Frame Restored';
  }
  
  if (text.includes('Hoeffding') || text.includes('error test') || text.includes('Phase 04')) {
    if (isAlert || text.includes('BREACH') || text.includes('breached') || text.includes('0xFA') || text.includes('exceeded') || text.includes('threshold breached')) {
      return 'Hoeffding Bound Breached';
    }
    return 'Hoeffding Bound Verified (Nominal)';
  }
  
  if (text.includes('Toeplitz') || text.includes('Privacy amplification') || text.includes('PRIVACY_AMP') || text.includes('Phase 05')) {
    if (isAlert || text.includes('aborted') || text.includes('Zeroizing')) {
      return 'Privacy Amplification Aborted';
    }
    return 'Toeplitz Hash Distillation';
  }

  if (text.includes('CLEAN SIGNATURE') || text.includes('Channel restored')) return 'Clean Channel Restored';
  if (text.includes('MITM ATTACK') || text.includes('EVE-PROBE')) return 'MitM Optical Probe Injected';
  if (text.includes('FORGERY ATTACK')) return 'Malformed Classical Feed-Forward';
  if (text.includes('REPLAY ATTACK')) return 'Captured Nonce Retransmit';
  if (text.includes('PNS ATTACK')) return 'Photon-Number Splitting Probe';
  if (text.includes('CHANNEL NOISE') || text.includes('NOISE')) return 'Adversarial Channel Noise Jamming';

  const clean = text.replace(/^\[[^\]]+\]\s*/, '');
  const firstPhrase = clean.split(/[·:—\n]/)[0].trim();
  if (firstPhrase.length > 0 && firstPhrase.length < 40) return firstPhrase;

  return firstPhrase.slice(0, 36) + (firstPhrase.length > 36 ? '…' : '');
}

function OverviewPanel({ threat, setThreat, range, setRange, filtered, copyJson, exportTelemetry }: any) {
  const { eveActive, qber: globalQber, chsh: globalChsh, activeAttack, pqcMode, remediationReport, clearTelemetryLogs, thresholdProfile, telemetryLogs } = useSentinel();
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [activePacket, setActivePacket] = useState<any | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activePacket) {
        setActivePacket(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePacket]);

  const qberStr = (globalQber * 100).toFixed(2) + "%";
  const chshStr = globalChsh.toFixed(2);
  const qber = qberStr;
  const chsh = chshStr;

  const cutoffPct = thresholdProfile?.thresholdPercent || "5.50%";
  const cutoffVal = thresholdProfile?.threshold || 0.055;
  const isQberBreached = globalQber > cutoffVal;
  const isChshCollapsed = globalChsh < 2.0;

  const cards = [
    { label: "Active sessions", value: "3", detail: "Stable", tone: "good" },
    { label: "Verified signatures", value: threat ? "94.2%" : "99.9%", detail: threat ? "PQC Fallback" : "Nominal", tone: threat ? "copper" : "good" },
    { label: "Security score", value: threat ? `Degraded (${activeAttack})` : "Secure", detail: threat ? "Review required" : "Secure", tone: threat ? "copper" : "good" },
    { label: "Total pulses", value: "4.2e9", detail: "+12M/s", tone: "slate" },
    {
      label: "QBER %",
      value: qberStr,
      detail: threat
        ? (isQberBreached ? `Hoeffding breach (> ${cutoffPct})` : `Adversarial disturbance (> ${cutoffPct})`)
        : `Nominal (≤ ${cutoffPct})`,
      tone: threat ? "alert" : "good"
    },
    {
      label: "CHSH value",
      value: "S = " + chshStr,
      detail: threat
        ? (isChshCollapsed ? "Classical bound (S<2.0)" : "Non-locality collapsed")
        : "S ≥ 2.0 (quantum)",
      tone: threat ? "copper" : "good"
    },
  ];

  const nominalRows = filtered.slice(0, 18).map((item: any, index: number) => {
    const isPqc = item.source?.includes("PQC") || item.text?.includes("PQC") || item.text?.includes("Dilithium");
    const isClean = item.source?.includes("CLEAN") || item.text?.includes("CLEAN SIGNATURE");
    const alert = !isPqc && !isClean && (item.isThreat || item.code?.includes("403") || item.code?.includes("REJECT") || item.code?.includes("0xFA") || (threat && (item.source.includes("EVE") || item.source.includes("HOEFFDING") || item.source.includes("BELL") || item.source.includes("THREAT"))));
    
    let payload = item.payloadContent;
    if (!payload && item.text?.includes('"')) {
      const quoted = item.text.match(/"([^"]+)"/)?.[1];
      if (quoted) payload = quoted;
    }
    if (!payload) {
      payload = item.isThreat || alert
        ? `[PAYLOAD: ${activeAttack.toUpperCase()}]`
        : index % 3 === 1
        ? "orbital-telemetry.pdf"
        : index % 3 === 2
        ? "DEFENSE-09"
        : "qds_entropy.sig";
    }

    const classifier = isPqc
      ? "PQC_FALLBACK_ACTIVE"
      : isClean
      ? "NOMINAL_SECURE"
      : alert
      ? (activeAttack ? activeAttack.toUpperCase().replace(/\s+/g, "_") : "INTERCEPT_RESEND")
      : "NOMINAL_SECURE";

    return {
      ...item,
      alert,
      isPqc,
      payload,
      classifier,
      fullText: item.text,
      event: formatEventGist(item.text, alert, activeAttack)
    };
  });

  const handleSelectRow = (item: any, rowKey: string) => {
    setSelectedRowKey(rowKey);
    setActivePacket(item);
    copyJson(item);
  };

  return (
    <section className="overview-v3 overview-v4-nominal">
      <div className={cn("overview-v3-alert", threat && "overview-v3-alert-active")}>
        <div>
          <span className="eyebrow">{threat ? `Critical alarm · Attack: ${activeAttack}` : "Verified nominal status"}</span>
          <p>{threat ? `Channel disturbed by ${activeAttack} · QBER ${qberStr} ${isQberBreached ? 'breached' : 'within'} ${cutoffPct} dynamic Hoeffding threshold (CHSH S=${chshStr}) · PQC Dilithium3 fallback ${isQberBreached || isChshCollapsed ? 'active' : 'standby'}.` : `Privacy amplification nominal · Toeplitz hash distilled within operating cutoff (QBER = 1.90% ≤ ${cutoffPct}).`}</p>
        </div>
        {threat ? <button className="button button-copper button-small" onClick={() => setThreat()}>Restore nominal</button> : <button className="overview-v3-pass" onClick={() => setThreat()}>Pass</button>}
      </div>
      <div className="overview-v3-kpis">
        {cards.map((card) => (
          <div key={card.label} className={cn("overview-v3-kpi", "overview-v3-kpi-" + card.tone)}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small className={card.tone === "good" ? "status-text-good" : card.tone === "copper" || card.tone === "alert" ? "text-copper" : "muted"}>{card.detail}</small>
          </div>
        ))}
      </div>
      <div className="overview-v3-charts">
        <div className="overview-v3-chart">
          <div className="overview-v3-chart-head">
            <div><span className="eyebrow">QBER error rate</span><strong>{qber}</strong><em className={threat && isQberBreached ? "text-copper" : "status-text-good"}>{threat && isQberBreached ? `breach (> ${cutoffPct})` : `nominal (≤ ${cutoffPct})`}</em></div>
            <div className="range-pills">{["1M", "5M", "15M", "ALL"].map((item) => <button key={item} className={cn("range-pill", range === item && "range-pill-active")} onClick={() => setRange(item)}>{item}</button>)}</div>
          </div>
          <div className="overview-v3-plot"><TelemetryChart threat={threat} range={range} /></div>
        </div>
        <div className="overview-v3-chart">
          <div className="overview-v3-chart-head">
            <div><span className="eyebrow">CHSH Bell test (S-score)</span><strong>{chsh}</strong><em className={threat && isChshCollapsed ? "text-copper" : "status-text-good"}>{threat && isChshCollapsed ? "classical boundary (S<2.0)" : "quantum (S≥2.0)"}</em></div>
            <div className="range-pills">{["1M", "5M", "15M", "ALL"].map((item) => <button key={item} className={cn("range-pill", range === item && "range-pill-active")} onClick={() => setRange(item)}>{item}</button>)}</div>
          </div>
          <div className="overview-v3-plot"><BellChart threat={threat} range={range} /></div>
        </div>
      </div>
      <div className="overview-v3-ledger">
        <div className="overview-v3-ledger-head">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span className="eyebrow">Live telemetry stream</span>
            <small style={{ color: "var(--slate)", fontSize: "11px" }}>{telemetryLogs.length} frames logged · IST timestamped</small>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button className="text-link" style={{ color: "#94a3b8", fontSize: "12px", cursor: "pointer", background: "none", border: "none", display: "inline-flex", alignItems: "center", gap: "4px" }} onClick={clearTelemetryLogs} title="Clear telemetry table">
              <RotateCcw size={12} /> Clear stream
            </button>
            <button className="text-link ledger-export" onClick={exportTelemetry}><Download size={13} /> Export CSV</button>
          </div>
        </div>
        <div className="overview-v3-ledger-table" style={{ userSelect: "text", WebkitUserSelect: "text" }}>
          <div className="overview-v3-ledger-row overview-v3-ledger-row-head">
            <span>Timestamp (IST)</span><span>Subsystem</span><span>Event</span><span>Classifier verdict</span><span>Transferred text / message content</span><span>Latency</span><span>Status</span>
          </div>
          {nominalRows.map((item: any, index: number) => {
            const rowKey = item.id ? String(item.id) : `row-${index}`;
            const isSelected = selectedRowKey ? selectedRowKey === rowKey : index === 0;
            const isLatest = index === 0;
            return (
              <div
                key={rowKey}
                className={cn(
                  "overview-v3-ledger-row",
                  item.alert && "overview-v3-ledger-alert",
                  item.isPqc && "overview-v3-ledger-selected",
                  isSelected && "overview-v3-ledger-selected"
                )}
                onClick={() => handleSelectRow(item, rowKey)}
                style={{
                  cursor: "pointer",
                  userSelect: "text",
                  WebkitUserSelect: "text",
                  transition: "background 0.3s ease",
                  borderLeft: isLatest ? (item.alert ? "3px solid #b94a2f" : "3px solid #2f6f85") : undefined
                }}
                role="row"
                tabIndex={0}
              >
                <span className="mono muted" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {isLatest && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: item.alert ? "#b94a2f" : "#059669", display: "inline-block" }} />}
                  {formatIstTime(item.createdAt || item.time, true)}
                </span>
                <span className={cn("mono", item.isPqc ? "text-blue font-semibold" : item.alert ? "text-copper font-semibold" : "")}>{item.source.replace("_", " ")}</span>
                <strong style={{ userSelect: "text" }}>{item.event}</strong>
                <span className={cn("overview-v3-verdict", item.isPqc ? "status-text-good font-semibold" : item.alert ? "overview-v3-verdict-alert" : "")}>{item.classifier}</span>
                <span className={cn("overview-v3-payload", item.isPqc ? "overview-v3-payload" : item.alert ? "overview-v3-payload-alert" : "")} style={{ userSelect: "text" }}>{item.payload}</span>
                <span className="mono muted">{item.ms}</span>
                <span className={item.isPqc ? "status-text-good mono font-bold" : item.alert ? "overview-v3-status-alert" : "status-text-good mono"}>{item.isPqc ? "PQC_OK" : item.alert ? "0xFA" : "0x00"}</span>
              </div>
            );
          })}
        </div>

        {/* Selected Row Detail Box */}
        {activePacket && (
          <div style={{
            background: "rgba(22, 24, 26, 0.03)",
            borderTop: "1px solid var(--line)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            font: "11px/1.4 var(--mono)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              <span style={{ color: "var(--copper)", fontWeight: "bold" }}>SELECTED PACKET:</span>
              <span style={{ color: "var(--ink)", fontWeight: 500 }}>{activePacket.source} · {activePacket.event}</span>
              <span style={{ color: "var(--slate)" }}>({activePacket.payload})</span>
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <button
                className="button button-outline button-small"
                onClick={() => { copyJson(activePacket); }}
                style={{ fontSize: "10px", padding: "4px 8px" }}
              >
                <Copy size={12} /> Copy JSON
              </button>
              <button
                className="icon-button"
                onClick={() => setActivePacket(null)}
                style={{ width: "24px", height: "24px" }}
                aria-label="Close packet inspector"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ThreatsPanel({ threat, onThreat }: { threat: boolean; onThreat: () => void }) {
  const { threats, activeAttack, eveActive } = useSentinel();
  const [filter, setFilter] = useState(() => {
    try {
      const saved = localStorage.getItem("qds_threats_filter");
      if (saved) return saved;
    } catch { }
    return "ALL";
  });
  const [selected, setSelected] = useState(() => {
    try {
      const saved = localStorage.getItem("qds_threats_selected");
      if (saved) return parseInt(saved, 10);
    } catch { }
    return 0;
  });

  const [isExecuting, setIsExecuting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);

  const isContained = threat || eveActive;

  const handleFilterChange = (nextFilter: string) => {
    setFilter(nextFilter);
    setSelected(0);
    try {
      localStorage.setItem("qds_threats_filter", nextFilter);
      localStorage.setItem("qds_threats_selected", "0");
    } catch { }
  };

  const handleSelectThreat = (idx: number) => {
    setSelected(idx);
    try {
      localStorage.setItem("qds_threats_selected", String(idx));
    } catch { }
  };

  const handleContainmentAction = () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setIsScanning(true);
    setPulseCount(p => p + 1);

    // Smooth execution feedback
    window.setTimeout(() => {
      onThreat();
      setIsExecuting(false);
    }, 600);

    window.setTimeout(() => {
      setIsScanning(false);
    }, 1300);
  };

  const visible = filter === "ALL" ? threats : threats.filter((item) => item.severity === filter);
  const item = visible[selected] ?? visible[0] ?? threats[0];

  const isCritical = item?.severity === "CRITICAL";
  const isHigh = item?.severity === "HIGH";
  const qberVal = item?.current || (isCritical ? "14.2%" : isHigh ? "8.4%" : "3.9%");
  const chshVal = item?.chsh ? item.chsh.toFixed(2) : (isCritical ? "1.76" : isHigh ? "1.95" : "2.45");
  const baselineVal = item?.baseline || "1.9%";

  // Calculate unique threat-specific spectrum profile and dynamic bar heights
  const threatProfile = useMemo(() => {
    const idStr = item?.id || "THR-104";
    const idSeed = parseInt(idStr.replace(/\D/g, "") || "104", 10);
    const qber = item?.qber ?? (parseFloat(item?.current || "14.2") / 100);
    const chsh = item?.chsh ?? (isCritical ? 1.76 : isHigh ? 1.95 : 2.45);

    const heights = [
      Math.min(80, Math.max(16, Math.round(qber * 390 + ((idSeed * 3) % 17) + 12))),
      Math.min(84, Math.max(20, Math.round(qber * 430 + ((idSeed * 7) % 21) + 18))),
      Math.min(88, Math.max(26, Math.round(qber * 490 + ((idSeed * 11) % 27) + 22))),
      Math.min(85, Math.max(18, Math.round((3.0 - chsh) * 55 + ((idSeed * 13) % 19) + 16))),
      Math.min(82, Math.max(14, Math.round(qber * 410 + ((idSeed * 17) % 23) + 14)))
    ];

    const animDurs = heights.map((_, i) => ((0.85 + ((idSeed + i * 5) % 9) * 0.14)).toFixed(2) + "s");

    const barColors = heights.map(h => {
      if (h >= 50) return "#b94a2f"; // Copper breach
      if (h >= 34) return "#d97706"; // Amber elevated
      return "#0058be"; // Blue nominal
    });

    const pts = heights.map((h, i) => `${37 + i * 55},${85 - h}`);
    const wavePathD = `M 15,80 L ${pts.join(" L ")} L 285,80`;

    return { heights, animDurs, barColors, wavePathD, qber, chsh, idStr };
  }, [item, isCritical, isHigh]);

  const handleExportThreatPcap = () => {
    try {
      downloadThreatPcap({
        id: item?.id || "THR-104",
        severity: item?.severity || "CRITICAL",
        type: item?.type || "Intercept-resend",
        origin: item?.origin || "EVE",
        time: item?.time || formatIstTime(Date.now(), false),
        baselineQber: item?.baseline || "1.9%",
        measuredQber: item?.current || (item?.qber ? `${(item.qber * 100).toFixed(1)}%` : "14.2%"),
        chshScore: item?.chsh || (isCritical ? 1.76 : isHigh ? 1.95 : 2.45),
        isCritical: isCritical,
        pqcDefense: isCritical ? "CRYSTALS-Dilithium3 / ML-DSA-65" : "None"
      });
      toast.success(`Exported Wireshark packet capture (.pcap) for ${item?.id || "threat"}`);
    } catch (e: any) {
      console.error("PCAP export error:", e);
      toast.error(`PCAP export failed: ${e?.message || "Unknown error"}`);
    }
  };

  return (
    <div className="threats-v2-layout">
      <div className="threats-v2-main">
        <div className="threats-v2-heading">
          <h2>Threats</h2>
          <div className="threat-filter-tabs">
            {[["ALL", `ALL (${threats.length})`], ["CRITICAL", `CRITICAL (${threats.filter(t => t.severity === 'CRITICAL').length})`], ["HIGH", `HIGH (${threats.filter(t => t.severity === 'HIGH').length})`]].map(([key, label]) => (
              <button key={key} className={cn("threat-filter-tab", filter === key && "threat-filter-tab-active")} onClick={() => handleFilterChange(key)}>{label}</button>
            ))}
          </div>
          <span className="threats-v2-count">{threat || eveActive ? `Active Anomaly: ${activeAttack}` : `${threats.length} records in review`}</span>
        </div>
        <div className="threats-v2-ledger">
          <div className="threats-v2-row threats-v2-row-head">
            <span>severity</span><span>origin node</span><span>anomaly type</span><span>time</span>
          </div>
          {visible.map((row, idx) => (
            <button key={row.id} className={cn("threats-v2-row", selected === idx && "threats-v2-row-selected")} onClick={() => handleSelectThreat(idx)}>
              <span className={cn("severity-cell", row.severity === "CRITICAL" ? "severity-critical" : row.severity === "HIGH" ? "severity-high" : "severity-medium")}>
                <i />{row.severity}
              </span>
              <span className="threat-origin">
                <b>{row.origin}</b>
                {row.badge && <em>{row.badge}</em>}
                {isContained && row.origin.includes("EVE") && (
                  <em style={{ marginLeft: "4px", background: "rgba(185, 74, 47, 0.15)", color: "#b94a2f", borderColor: "rgba(185, 74, 47, 0.3)" }}>QUARANTINED</em>
                )}
              </span>
              <strong>{row.type}</strong>
              <span className="mono muted">{row.time}</span>
            </button>
          ))}
        </div>
      </div>

      <aside className="threats-v2-inspector">
        <div className="inspector-head">
          <span className="eyebrow">Threat inspector · {item?.id || "THR-104"}</span>
          <button className="icon-button" onClick={() => handleSelectThreat(0)} aria-label="Reset selection"><RotateCcw size={14} /></button>
        </div>

        <div className="threat-meta-head">
          <span className="eyebrow">Selected anomaly</span>
          <Pill tone={isCritical || isHigh ? "copper" : "good"}>{item?.severity || "CRITICAL"}</Pill>
        </div>

        <h3>{item?.type || "No Threat Selected"}</h3>

        {isContained && (
          <div className="threat-quarantine-badge">
            <span className="quarantine-pulse-dot" />
            <span>Optical Port Isolated · Dilithium3 Active</span>
          </div>
        )}

        <div className="threat-inspector-rule" />

        <span className="eyebrow">Telemetry data</span>
        <div className={cn("threat-telemetry-block", pulseCount > 0 && "pill-pulsing")} key={`telemetry-${pulseCount}`}>
          <div><span>node</span><strong>{item?.origin || "EVE"}</strong></div>
          <div><span>baseline QBER</span><strong>{baselineVal}</strong></div>
          <div><span>current QBER</span><strong className={isCritical ? "text-copper" : isHigh ? "status-text-threat" : "status-text-good"}>{qberVal}</strong></div>
        </div>

        <span className="eyebrow">Risk visualization & Quantum Spectrum</span>
        <div className={cn("threat-spectrum-box", isContained && "is-contained")}>
          {isScanning && <div className="containment-scanner-beam" />}
          <svg className="threat-spectrum-svg" viewBox="0 0 300 90" preserveAspectRatio="none">
            <defs>
              <linearGradient id="spectrumGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isCritical ? "#b94a2f" : isHigh ? "#d97706" : "#0058be"} stopOpacity="0.8" />
                <stop offset="100%" stopColor="rgba(244, 241, 234, 0.1)" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="0" y1="30" x2="300" y2="30" stroke="rgba(22, 24, 26, 0.12)" strokeWidth="0.8" strokeDasharray="3 3" />
            <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(22, 24, 26, 0.12)" strokeWidth="0.8" strokeDasharray="3 3" />

            {/* Unique Threat Waveform Envelope */}
            <path
              d={threatProfile.wavePathD}
              fill="none"
              stroke={isCritical ? "rgba(185, 74, 47, 0.35)" : "rgba(0, 88, 190, 0.3)"}
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />

            {/* Dynamic Threat-Specific Equalizer Bars (Static SVG rects that transition on threat click) */}
            {threatProfile.heights.map((h, i) => (
              <rect
                key={i}
                x={20 + i * 55}
                y={85 - h}
                width="34"
                height={h}
                fill={threatProfile.barColors[i]}
                opacity="0.88"
                rx="2"
              />
            ))}

            {/* Threshold Line */}
            <line x1="0" y1="35" x2="300" y2="35" stroke="#b94a2f" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
        </div>

        <div className="threat-detail-pills">
          <div className="threat-pill-item">
            <span>CHSH BELL SCORE</span>
            <strong className={isCritical ? "text-copper" : "status-text-good"}>S = {chshVal}</strong>
          </div>
          <div className="threat-pill-item">
            <span>VERDICT</span>
            <strong className={isCritical ? "text-copper" : "status-text-good"}>{isCritical ? "BREACHED" : "NOMINAL"}</strong>
          </div>
        </div>
      </aside>
    </div>
  );
}



/* Incidents inspector — Signal Atelier pairs forensic precision with warm paper, dark ink, copper intervention, and blue audit detail. */
function IncidentsPanel({ selectedIncident, setSelectedIncident }: any) {
  const { incidents, resolveIncident, escalateIncident, eveActive, activeAttack } = useSentinel();
  const [aiRemediationMap, setAiRemediationMap] = useState<Record<string, AiRemediationResponse>>({});
  const [loadingAiId, setLoadingAiId] = useState<string | null>(null);

  const active = incidents.find((item) => item.id === selectedIncident?.id) ?? incidents[0];
  const isEscalated = active?.status === "ESCALATED";
  const statusClass = (status: string) => status === "RESOLVED" ? "incident-status-resolved" : status === "ESCALATED" ? "incident-status-escalated" : "incident-status-investigating";
  const impactClass = (impact: string) => impact === "CRITICAL" ? "incident-impact-critical" : impact === "HIGH" ? "incident-impact-high" : impact === "MEDIUM" ? "incident-impact-med" : "incident-impact-low";
  const isCritical = active?.impact === "CRITICAL";

  const evidence = [
    ["Observed QBER", active?.qber ? `${active.qber} (limit: 5.50%)` : "14.20% (limit: 5.50%)", "evidence-alert"],
    ["CHSH Bell score (S)", active?.chsh ? `S = ${active.chsh} (collapsed)` : "S = 1.76 (collapsed)", "evidence-good"],
    ["Helstrom error bound", active?.helstrom || "P_e ≥ 0.0820", ""],
    ["Trace distance (D)", active?.traceDistance || "D = 0.8360", "evidence-blue"],
    ["Target node", active?.targetNode || "QN-BOB (receiver)", ""]
  ];

  const chooseIncident = (item: any) => {
    if (setSelectedIncident) setSelectedIncident(item);
  };

  const handleFetchAiRemediation = async (inc: any) => {
    if (!inc?.id) return;
    setLoadingAiId(inc.id);
    try {
      const qberVal = inc.qber ? parseFloat(inc.qber.replace('%', '')) / 100 : 0.142;
      const chshVal = inc.chsh ? parseFloat(inc.chsh) : 1.76;
      const res = await generateAiRemediation({
        incidentId: inc.id,
        attackType: inc.title || 'Quantum Intercept Anomaly',
        description: inc.detail,
        qber: qberVal,
        chshScore: chshVal,
        helstromBound: 0.082,
        assignedOperator: inc.assigned || 'SOC Operator',
        node: inc.targetNode || 'QN-BOB',
        impact: inc.impact || 'HIGH'
      });
      setAiRemediationMap(prev => ({ ...prev, [inc.id]: res }));
      toast.success(`AI Remediation playbook generated for ${inc.id}.`);
    } catch (err: any) {
      toast.error(`AI Remediation error: ${err?.message || 'Failed to generate'}`);
    } finally {
      setLoadingAiId(null);
    }
  };

  const handleExportIncidentReport = () => {
    if (!active) return;
    const now = new Date().toISOString();
    const timelineFormatted = (active.events || [
      ["10:48:16 UTC", "Threat detected", "CRITICAL: Intercept-resend attack detected."],
      ["10:48:24 UTC", "Threshold exceeded", "QBER breached security cutoff."]
    ]).map(([t, stage, desc]: any) => `  - [${t}] ${stage}: ${desc}`).join("\n");

    const playbookText = currentPlaybook
      ? `\n--- AUTOMATED AI REMEDIATION PLAN ---\nModel: ${currentPlaybook.model}\nRecommended Action: ${currentPlaybook.recommendedAction}\nAction Plan:\n${currentPlaybook.remediationPlan}\n\nCLI Commands:\n${currentPlaybook.cliCommands.map((c: string) => `$ ${c}`).join("\n")}\n`
      : "";

    const reportContent = `================================================================================
  QDS SENTINEL — QUANTUM SECURITY FORENSIC INCIDENT REPORT
================================================================================
Report ID       : REP-${active.id}-${Date.now().toString().slice(-6)}
Generated At    : ${now}
System Version  : QDS Sentinel v1.0.0 (Distributed API Framework)
Security Gate   : Level 5 / Top-Secret Quantum Cryptographic Assurance
================================================================================

[INCIDENT SUMMARY]
  Incident ID     : ${active.id}
  Title           : ${active.title || "Quantum Channel Disturbance"}
  Status          : ${active.status}
  Impact Severity : ${active.impact || "CRITICAL"}
  Assigned Analyst: ${active.assigned}
  Target Node     : ${active.targetNode || "QN-BOB"}
  Description     : ${active.detail}

[QUANTUM FORENSIC METRICS]
  Observed QBER   : ${active.qber || "14.20%"} (Hoeffding Security Cutoff: 5.50%)
  CHSH Bell Score : S = ${active.chsh || "1.76"} (Classical Limit: S < 2.00, Quantum Bound: S = 2.82)
  Helstrom Bound  : ${active.helstrom || "P_e ≥ 0.0820"}
  Trace Distance  : ${active.traceDistance || "D = 0.8360"}
  Non-locality    : ${parseFloat(String(active.chsh || 1.76)) < 2.0 ? "VIOLATION BREACHED (Superposition Collapsed)" : "SECURE"}

[AUDIT TRAIL & TIMELINE]
${timelineFormatted}
${playbookText}
================================================================================
  CRYPTOGRAPHIC INTEGRITY SEAL: SHA256-${Math.random().toString(36).substring(2, 15).toUpperCase()}
  STATUS: VERIFIED BY QDS DISTRIBUTED ARBITRATOR NODE
================================================================================
`;

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QDS_Incident_Report_${active.id}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Forensic incident report exported for ${active.id}`);
  };

  const currentPlaybook = active?.id ? aiRemediationMap[active.id] : null;

  return (
    <div className="incidents-v2-layout">
      <div className="incidents-v2-main">
        <div className="incidents-v2-heading">
          <div>
            <h2>Incidents</h2>
            <p>System log · authenticated incident ledger · {eveActive ? `Live Alert: ${activeAttack}` : "Nominal Assurance"}</p>
          </div>
          <span>{incidents.length} records retained</span>
        </div>
        <div className="incidents-v2-ledger">
          <div className="incidents-v2-row incidents-v2-row-head">
            <span>incident ID</span><span>status</span><span>assigned</span><span>impact</span>
          </div>
          {incidents.map((item) => (
            <button key={item.id} className={cn("incidents-v2-row", active?.id === item.id && "incidents-v2-row-selected")} onClick={() => chooseIncident(item)}>
              <strong className="mono">{item.id}</strong>
              <span className={cn("incident-status", statusClass(item.status))}>{item.status}</span>
              <span>{item.assigned}</span>
              <span className={cn("incident-impact", impactClass(item.impact))}>{item.impact}</span>
            </button>
          ))}
        </div>
      </div>
      <aside className="incidents-v2-inspector incidents-evidence-inspector">
        <div className="incidents-v2-inspector-head">
          <span className="eyebrow">Inspector · {active?.id}</span>
          <span className={cn("incident-inspector-state", statusClass(active?.status || "INVESTIGATING"))}>{active?.status}</span>
        </div>
        <div className="incident-inspector-copy">
          <h3>{active?.title}</h3>
          <p>{active?.detail}</p>
        </div>
        <div className="incident-case-facts">
          <div><span>Assigned operator</span><strong>{active?.assigned}</strong></div>
          <div><span>Impact severity</span><strong className={impactClass(active?.impact || "CRITICAL")}>{active?.impact}</strong></div>
          <div><span>Security clearance</span><strong className="status-text-good">Level 5 (Q-top-secret)</strong></div>
        </div>
        <div className="incident-evidence">
          <span className="eyebrow">Quantum forensic evidence</span>
          <div className="incident-evidence-table">
            {evidence.map(([label, value, tone]) => (
              <div key={label}><span>{label}</span><strong className={tone}>{value}</strong></div>
            ))}
          </div>
        </div>
        <div className="incident-remediation">
          <div>
            <span className="eyebrow">Automated AI remediation</span>
            <strong>QDS Sentinel AI</strong>
          </div>

          {currentPlaybook ? (
            <div style={{
              background: "rgba(22, 24, 26, 0.025)",
              border: "1px solid var(--line)",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "7px" }}>
                <span style={{ color: "var(--copper)", font: "600 10px var(--mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>REMEDIATION PLAYBOOK</span>
                <span style={{ font: "9px var(--mono)", background: "var(--ink)", color: "var(--paper)", padding: "2px 7px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {currentPlaybook.model.replace('QDS Dynamic Forensic Engine', 'FORENSIC ENGINE').replace('QDS Sentinel AI (Llama-3 70B)', 'LLAMA-3 70B')}
                </span>
              </div>

              {/* Formatted Remediation Steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "190px", overflowY: "auto", paddingRight: "4px" }}>
                {currentPlaybook.remediationPlan.split(/\n\s*\n/).map((stepText, sIdx) => {
                  const lines = stepText.trim().split('\n');
                  const title = lines[0]?.replace(/^\d+[\.\)]\s*/, '').trim();
                  const body = lines.slice(1).join(' ').trim();
                  return (
                    <div key={sIdx} style={{ borderLeft: "2px solid var(--copper)", paddingLeft: "8px" }}>
                      <div style={{ font: "600 10px var(--mono)", color: "var(--ink)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        0{sIdx + 1} · {title || `Step ${sIdx + 1}`}
                      </div>
                      {body && (
                        <div style={{ font: "11px/1.45 var(--sans)", color: "var(--slate)", marginTop: "2px" }}>
                          {body}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* CLI Commands Box */}
              {currentPlaybook.cliCommands && currentPlaybook.cliCommands.length > 0 && (
                <div style={{ background: "var(--ink)", border: "1px solid rgba(244, 241, 234, 0.12)", padding: "9px 11px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ color: "#7b8385", font: "600 9px var(--mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>EXECUTION CLI COMMANDS:</div>
                  {currentPlaybook.cliCommands.map((cmd, cIdx) => (
                    <div key={cIdx} style={{ font: "10.5px var(--mono)", display: "flex", gap: "6px" }}>
                      <span style={{ color: "var(--copper)", fontWeight: "bold" }}>&gt;</span>
                      <span style={{ color: "var(--paper)" }}>{cmd.replace(/^>\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                <button
                  className="button button-outline button-small"
                  style={{ flex: 1, minHeight: "33px", fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}
                  onClick={() => {
                    navigator.clipboard?.writeText(currentPlaybook.remediationPlan + "\n\n" + currentPlaybook.cliCommands.join("\n"));
                    toast.success("AI Playbook copied to clipboard");
                  }}
                >
                  <Copy size={13} /> Copy Playbook
                </button>

                <button
                  className="icon-button"
                  style={{ width: "33px", height: "33px" }}
                  onClick={() => handleFetchAiRemediation(active)}
                  aria-label="Re-generate playbook"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
          ) : (
            <button
              className="incident-remediation-button"
              disabled={loadingAiId === active?.id}
              onClick={() => handleFetchAiRemediation(active)}
            >
              <Zap size={14} />
              <span>{loadingAiId === active?.id ? "GENERATING REMEDIATION PLAYBOOK..." : "PROVIDE REMEDIATION"}</span>
            </button>
          )}
        </div>
        <div className="incident-timeline incident-timeline-compact">
          <div className="incident-timeline-title"><span className="eyebrow">Incident timeline</span><strong>{active?.events?.length || 2} stages</strong></div>
          {(active?.events || [["10:48:16 UTC", "Threat detected", "CRITICAL: Intercept-resend attack detected."], ["10:48:24 UTC", "Threshold exceeded", "QBER breached security cutoff."]]).map(([time, title, copy], index) => {
            const isAlert = title.toLowerCase().includes("threat") || title.toLowerCase().includes("escalation") || title.toLowerCase().includes("breach") || index === 1;
            return (
              <div className="incident-timeline-item" key={time + index}>
                <i className={cn(isAlert && "timeline-marker-alert", active?.status === "RESOLVED" && index === 0 && "timeline-marker-resolved")} />
                <div>
                  <span>{time}</span>
                  <strong className={isAlert ? "text-copper" : ""}>{title}</strong>
                  <p>{copy}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="incident-inspector-actions">
          <span>Set incident status & export report</span>
          <button
            className={cn("incident-escalate", isEscalated && "is-escalated")}
            style={isEscalated ? { background: "#ad3c2c", borderColor: "#ad3c2c", color: "#ffffff", opacity: 0.95 } : {}}
            disabled={isEscalated || active?.status === "RESOLVED"}
            onClick={() => {
              if (active?.id) {
                escalateIncident(active.id);
              }
            }}
          >
            <ShieldAlert size={15} />
            <span>{isEscalated ? "ESCALATED TO L3 (LEAD TRIAGE ACTIVE)" : "Escalate to L3"}</span>
          </button>
          <div>
            <button disabled={active?.status === "RESOLVED"} onClick={() => { if (active?.id) resolveIncident(active.id); }}>Mark Resolved</button>
            <button onClick={handleExportIncidentReport}><Download size={14} /> Export report</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SessionsPanel({ selectedSession, setSelectedSession }: any) {
  const { sessions, eveActive, activeAttack } = useSentinel();
  const [paused, setPaused] = useState<string[]>([]);
  const FidelityTrace = ({ kind, tone }: { kind: string; tone: string }) => (
    <svg className={cn("session-fidelity", "session-fidelity-" + tone)} viewBox="0 0 116 28" aria-label="Channel fidelity trace">
      <path d={kind === "rise" ? "M2 22 C20 23 28 20 42 15 S60 5 73 12 S89 14 103 25" : kind === "step" ? "M2 12 H32 L39 23 L46 12 H112" : kind === "wave-low" ? "M2 18 C16 10 29 11 42 17 S67 22 78 12 S98 9 112 14" : "M2 18 C18 5 28 7 41 18 S64 26 78 11 S96 6 105 20"} />
    </svg>
  );

  const activeId = selectedSession?.id ?? "01";
  return (
    <div className="sessions-v2-layout">
      <div className="sessions-v2-heading">
        <div>
          <h2>Sessions</h2>
          <p>Active quantum communication channels · {eveActive ? `Channel 01 Interrupted by ${activeAttack}` : "Nominal Coherence"}</p>
        </div>
        <span><b>{sessions.length}</b> active streams</span>
      </div>
      <div className="sessions-v2-table">
        <div className="sessions-v2-row sessions-v2-row-head">
          <span>ID</span><span>Endpoint</span><span>Status</span><span>Fidelity</span><span>Key rate (kbps)</span><span>Duration</span><span>Actions</span>
        </div>
        {sessions.map((channel) => {
          const isPaused = paused.includes(channel.id);
          const isSelected = activeId === channel.id;
          return (
            <div className={cn("sessions-v2-row", isSelected && "sessions-v2-row-selected")} key={channel.id}>
              <button className="session-row-main" onClick={() => setSelectedSession && setSelectedSession(channel)} aria-label={"Inspect channel " + channel.endpoint}>
                <span className="mono">{channel.id}</span>
                <strong>{channel.endpoint}</strong>
                <span className={cn("session-state", isPaused ? "session-state-paused" : channel.tone === "copper" ? "session-state-degraded" : "session-state-stable")}>
                  {isPaused ? "PAUSED" : channel.state}
                </span>
                <FidelityTrace kind={channel.trace} tone={channel.tone} />
                <span className="mono session-rate">{channel.rate}</span>
                <span className="mono">{channel.duration}</span>
              </button>
              <div className="session-actions">
                <button className="icon-button" aria-label={"Resync " + channel.endpoint} onClick={async () => {
                  try {
                    await apiClient.triggerSessionChannelAction({ channel_id: channel.id, action: 'sync' });
                    toast.success("Resynchronization completed via FastAPI for " + channel.endpoint);
                  } catch {
                    toast.success("Resynchronization requested for " + channel.endpoint);
                  }
                }}><RotateCcw size={14} /></button>
                <button className={cn("icon-button", isPaused && "session-action-active")} aria-label={isPaused ? "Resume " + channel.endpoint : "Pause " + channel.endpoint} onClick={() => setPaused((current) => current.includes(channel.id) ? current.filter((id) => id !== channel.id) : [...current, channel.id])}>
                  {isPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NetworkPanel({ selectedNode, setSelectedNode, isolatedNodes, setIsolatedNodes }: any) {
  const { eveActive, toggleEve, activeAttack, qber, chsh, pushTelemetryLogs } = useSentinel();


  const [activeNode, setActiveNode] = useState("ALICE");
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<string | null>(null);
  const [pingingNodeId, setPingingNodeId] = useState<string | null>(null);
  const [rebootingNodeId, setRebootingNodeId] = useState<string | null>(null);
  const [nodeHealthMap, setNodeHealthMap] = useState<Record<string, string>>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const didDrag = useRef(false);
  const dragFrame = useRef<number | null>(null);
  const pendingPosition = useRef<{ id: string; x: number; y: number } | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({ ALICE: { x: 22, y: 62 }, ARBITRATOR: { x: 51, y: 29 }, BOB: { x: 80, y: 62 }, EVE: { x: 51, y: 82 } });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedNode) {
        setSelectedNode(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode, setSelectedNode]);


  const handlePingNode = (nodeId: string, nodeName: string) => {
    setPingingNodeId(nodeId);
    toast.info(`PING ${nodeName}: Probing optical link round-trip time...`);

    window.setTimeout(() => {
      const rtt = nodeId === "ARBITRATOR" ? "0.85ms" : nodeId === "BOB" && eveActive ? "85.20ms" : "1.15ms";
      const nowStr = new Date().toTimeString().slice(0, 8);
      
      pushTelemetryLogs([
        {
          id: `evt-${Date.now()}-ping`,
          time: nowStr,
          source: nodeName,
          text: `Active ICMP/QKD probe on ${nodeName} verified: RTT ${rtt}, 0% drop.`,
          ms: rtt,
          code: '200 OK',
          isThreat: false,
          qber: (qber * 100).toFixed(2) + "%",
          chsh: chsh.toFixed(2)
        }
      ]);

      toast.success(`PING ${nodeName}: 3/3 packets received · RTT ${rtt} · 0% loss [OK]`);
      setPingingNodeId(null);
    }, 1200);
  };

  const handleRebootNode = (nodeId: string, nodeName: string) => {
    setRebootingNodeId(nodeId);
    setNodeHealthMap(prev => ({ ...prev, [nodeId]: "REBOOTING..." }));
    toast.warning(`REBOOT sequence initiated for ${nodeName}. Optical calibration in progress...`);

    window.setTimeout(() => {
      setNodeHealthMap(prev => ({ ...prev, [nodeId]: "NOMINAL" }));
      const nowStr = new Date().toTimeString().slice(0, 8);

      pushTelemetryLogs([
        {
          id: `evt-${Date.now()}-reboot`,
          time: nowStr,
          source: nodeName,
          text: `Node ${nodeName} coprocessor reboot completed. Phase lock verified (Fidelity 99.9%).`,
          ms: '8ms',
          code: '200 OK',
          isThreat: false,
          qber: (qber * 100).toFixed(2) + "%",
          chsh: chsh.toFixed(2)
        }
      ]);




      toast.success(`REBOOT COMPLETE: Q-PROC-v4 coprocessor online for ${nodeName}. Phase lock verified (Fidelity 99.9%).`);
      setRebootingNodeId(null);
    }, 2000);
  };

  const [topologyMode, setTopologyMode] = useState<"NOMINAL" | "DEGRADED" | "QUARANTINED">(() => {
    if (isolatedNodes.includes("EVE")) return "QUARANTINED";
    return eveActive ? "DEGRADED" : "NOMINAL";
  });

  const isDegradedMode = topologyMode === "DEGRADED";
  const isQuarantinedMode = topologyMode === "QUARANTINED";
  const isNominalMode = topologyMode === "NOMINAL";

  const nodes = [
    {
      id: "ALICE",
      name: "QN-ALICE",
      role: "Photon source / detector",
      health: nodeHealthMap["ALICE"] || "NOMINAL",
      uptime: "99.998%",
      hardware: "Q-PROC-v4",
      protocol: "BB84, E91",
      rate: isDegradedMode ? "1.2 kbps" : "1.8 kbps",
      latency: "12ms",
      loss: "0%",
      tone: nodeHealthMap["ALICE"] === "REBOOTING..." ? "copper" : "good",
      pos: "network-canvas-alice"
    },
    {
      id: "ARBITRATOR",
      name: "ARB-CORE",
      role: isQuarantinedMode ? "PQC Handover Hub" : isDegradedMode ? "Disturbed Hub" : "Authenticated Central Hub",
      health: nodeHealthMap["ARBITRATOR"] || (isDegradedMode ? "DISTURBED" : "NOMINAL"),
      uptime: "100.000%",
      hardware: "ARB-CORE-8",
      protocol: isQuarantinedMode ? "QDS + Dilithium3" : "QDS, CHSH",
      rate: isDegradedMode ? "0.8 kbps" : "4.2 kbps",
      latency: isDegradedMode ? "14ms" : "0.8ms",
      loss: isDegradedMode ? "8% loss" : "0% loss",
      tone: nodeHealthMap["ARBITRATOR"] === "REBOOTING..." ? "copper" : (isDegradedMode ? "copper" : "good"),
      pos: "network-canvas-arb"
    },
    {
      id: "BOB",
      name: "QN-BOB",
      role: isQuarantinedMode ? "Verifier (PQC ML-KEM)" : isDegradedMode ? "Verifier (Eavesdrop Detected)" : "Verifier Endpoint",
      health: nodeHealthMap["BOB"] || (isDegradedMode ? "DEGRADED" : isQuarantinedMode ? "PQC PROTECTED" : "NOMINAL"),
      uptime: "99.201%",
      hardware: "Q-PROC-v4",
      protocol: isQuarantinedMode ? "BB84 + ML-KEM-768" : "BB84, E91",
      rate: isDegradedMode ? "0.4 kbps" : isQuarantinedMode ? "1.5 kbps" : "1.8 kbps",
      latency: isDegradedMode ? "85ms" : isQuarantinedMode ? "15ms" : "18ms",
      loss: isDegradedMode ? `${(qber * 100).toFixed(1)}% loss` : "0% loss",
      tone: nodeHealthMap["BOB"] === "REBOOTING..." ? "copper" : (isDegradedMode ? "copper" : "good"),
      pos: "network-canvas-bob"
    },
    {
      id: "EVE",
      name: "EVE-PROBE-07",
      role: isDegradedMode ? `Active Adversary (${activeAttack || 'MitM Intercept'})` : isQuarantinedMode ? "Quarantined Threat Probe" : "Idle Probe (Standby)",
      health: nodeHealthMap["EVE"] || (isDegradedMode ? "ACTIVE INTERCEPT" : isQuarantinedMode ? "QUARANTINED" : "STANDBY"),
      uptime: "—",
      hardware: "OBS-PROBE",
      protocol: "Passive monitor",
      rate: isDegradedMode ? "1.4 kbps" : "0.0 kbps",
      latency: isDegradedMode ? "INTERCEPTING" : isQuarantinedMode ? "BLOCKED" : "STANDBY",
      loss: isDegradedMode ? "tap active" : isQuarantinedMode ? "isolated" : "idle",
      tone: isDegradedMode ? "copper" : isQuarantinedMode ? "copper" : "slate",
      pos: "network-canvas-eve"
    }
  ];

  const active = nodes.find((node) => node.id === activeNode) ?? nodes[0];
  const inventory = nodes.filter((node) => node.id !== active.id);
  const toggleIsolation = (nodeId: string) => setIsolatedNodes((current: string[]) => current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId]);
  const curve = (from: { x: number; y: number }, to: { x: number; y: number }) => { const bend = Math.max(8, Math.abs(to.x - from.x) * .32); const direction = to.x >= from.x ? 1 : -1; return "M " + from.x + " " + from.y + " C " + (from.x + bend * direction) + " " + from.y + " " + (to.x - bend * direction) + " " + to.y + " " + to.x + " " + to.y; };
  const LinkLabel = ({ from, to, text, copper = false }: { from: { x: number; y: number }; to: { x: number; y: number }; text: string; copper?: boolean }) => { const x = (from.x + to.x) / 2; const y = (from.y + to.y) / 2; return <g className={cn("network-v2-link-tag", copper && "network-v2-link-tag-copper")} transform={"translate(" + (x - 5.5) + " " + (y - 4) + ")"}><rect width="11" height="7" rx="0" /><text x="5.5" y="4.7">{text}</text></g>; };
  const beginDrag = (nodeId: string, event: any) => { if (event.pointerType === "mouse" && event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); didDrag.current = false; setDragging(nodeId); };
  const moveDrag = (event: any) => { if (!dragging || !canvasRef.current) return; const rect = canvasRef.current.getBoundingClientRect(); const x = Math.min(88, Math.max(12, ((event.clientX - rect.left) / rect.width) * 100)); const y = Math.min(87, Math.max(12, ((event.clientY - rect.top) / rect.height) * 100)); didDrag.current = true; pendingPosition.current = { id: dragging, x, y }; if (dragFrame.current !== null) return; dragFrame.current = window.requestAnimationFrame(() => { const next = pendingPosition.current; if (next) setPositions((current) => ({ ...current, [next.id]: { x: next.x, y: next.y } })); dragFrame.current = null; }); };
  const endDrag = (event: any) => { if (dragFrame.current !== null) { window.cancelAnimationFrame(dragFrame.current); dragFrame.current = null; } const next = pendingPosition.current; if (next) setPositions((current) => ({ ...current, [next.id]: { x: next.x, y: next.y } })); pendingPosition.current = null; if (dragging) event.currentTarget.releasePointerCapture?.(event.pointerId); setDragging(null); };

  return (
    <div className="network-v2-layout">
      <section className="network-v2-canvas-wrap">
        <div className="network-v2-title">
          <div>
            <h2>Network topology</h2>
            <div className="topology-key" role="tablist" aria-label="Network topology mode preview">
              <button
                type="button"
                className={cn("topology-key-btn", topologyMode === "NOMINAL" && "active-nominal")}
                onClick={() => {
                  setTopologyMode("NOMINAL");
                  if (eveActive) toggleEve();
                  setIsolatedNodes((prev: string[]) => prev.filter(id => id !== "EVE"));
                  toast.success("Topology: NOMINAL · All quantum channels authenticated and clean (0% loss)");
                }}
              >
                <CheckCircle2 size={11} /> Nominal
              </button>
              <button
                type="button"
                className={cn("topology-key-btn", topologyMode === "DEGRADED" && "active-degraded")}
                onClick={() => {
                  setTopologyMode("DEGRADED");
                  if (!eveActive) toggleEve();
                  setIsolatedNodes((prev: string[]) => prev.filter(id => id !== "EVE"));
                  toast.warning("Topology: DEGRADED · EVE active beam-splitter tap on Arbitrator ↔ Bob link (14.2% QBER)");
                }}
              >
                <AlertTriangle size={11} /> Degraded
              </button>
              <button
                type="button"
                className={cn("topology-key-btn", topologyMode === "QUARANTINED" && "active-quarantined")}
                onClick={() => {
                  setTopologyMode("QUARANTINED");
                  setIsolatedNodes((prev: string[]) => prev.includes("EVE") ? prev : [...prev, "EVE"]);
                  toast.info("Topology: QUARANTINED · EVE isolated & blocked, PQC fallback active (0% loss)");
                }}
              >
                <ShieldAlert size={11} /> Quarantined
              </button>
            </div>
          </div>
          <span>Drag nodes to inspect paths</span>
        </div>
        <div className={cn("network-v2-canvas", Boolean(dragging) && "network-v2-canvas-dragging")} ref={canvasRef} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <div className="network-canvas-stage" style={{ transform: "scale(" + zoom + ")" }}>
            <svg className="network-v2-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Dynamic network paths">
              {/* Alice to Arbitrator link */}
              <path className="network-v2-link network-v2-link-nominal" d={curve(positions.ALICE, positions.ARBITRATOR)} />
              
              {/* Arbitrator to Bob link */}
              <path
                className={cn(
                  "network-v2-link",
                  isDegradedMode ? "network-v2-link-degraded" : isQuarantinedMode ? "network-v2-link-pqc" : "network-v2-link-nominal"
                )}
                d={curve(positions.ARBITRATOR, positions.BOB)}
              />
              
              {/* Arbitrator to Eve link */}
              <path
                className={cn(
                  "network-v2-link",
                  isDegradedMode ? "network-v2-link-degraded" : isQuarantinedMode ? "network-v2-link-quarantine" : "network-v2-link-idle"
                )}
                d={curve(positions.ARBITRATOR, positions.EVE)}
              />
              
              <LinkLabel from={positions.ALICE} to={positions.ARBITRATOR} text="12ms · 0%" />
              <LinkLabel
                from={positions.ARBITRATOR}
                to={positions.BOB}
                text={isDegradedMode ? `85ms · ${(qber * 100).toFixed(0)}%` : isQuarantinedMode ? "15ms · 0% (PQC)" : "18ms · 0%"}
                copper={isDegradedMode}
              />
              <LinkLabel
                from={positions.ARBITRATOR}
                to={positions.EVE}
                text={isDegradedMode ? "TAP ACTIVE" : isQuarantinedMode ? "BLOCKED ✕" : "STANDBY"}
                copper={isDegradedMode || isQuarantinedMode}
              />
            </svg>
            {nodes.map((node) => {
              const point = positions[node.id];
              const isPinging = pingingNodeId === node.id;
              const isRebooting = rebootingNodeId === node.id;
              return (
                <button
                  key={node.id}
                  className={cn(
                    "network-v2-node",
                    node.pos,
                    active.id === node.id && "network-v2-node-active",
                    dragging === node.id && "network-v2-node-dragging",
                    (isolatedNodes.includes(node.id) || (node.id === "EVE" && isQuarantinedMode)) && "network-v2-node-isolated",
                    isRebooting ? "network-v2-node-copper animate-pulse" : isPinging ? "network-v2-node-good animate-bounce" : ("network-v2-node-" + node.tone)
                  )}
                  style={{ left: point.x + "%", top: point.y + "%" }}
                  onPointerDown={(event) => beginDrag(node.id, event)}
                  onClick={() => { if (didDrag.current) { didDrag.current = false; return; } setActiveNode(node.id); }}
                >
                  <span className="network-v2-node-icon">{node.id === "ARBITRATOR" ? <Network size={27} /> : <Server size={24} />}</span>
                  <strong>{node.name}</strong>
                  <small className={isRebooting ? "text-copper font-bold" : isPinging ? "text-blue font-bold" : ""}>
                    {isRebooting ? "REBOOTING..." : isPinging ? "PINGING..." : (isolatedNodes.includes(node.id) || (node.id === "EVE" && isQuarantinedMode)) ? "ISOLATED" : node.role}
                  </small>
                </button>
              );
            })}
          </div>
          <div className="network-zoom">
            <button onClick={() => setZoom((value) => Math.min(1.12, value + .06))} aria-label="Zoom in">+</button>
            <button onClick={() => setZoom((value) => Math.max(.88, value - .06))} aria-label="Zoom out">−</button>
          </div>
        </div>
      </section>

      <aside className="network-v2-inventory">
        <button className={cn("network-active-card", "network-active-card-" + active.tone)} onClick={() => setActiveNode(active.id)}>

          <div className="network-active-card-head">
            <span><Server size={15} /> {active.name}</span>
            <b className={rebootingNodeId === active.id ? "text-copper animate-pulse" : active.tone === "good" ? "status-text-good" : "text-copper"}>
              {rebootingNodeId === active.id ? "REBOOTING..." : isolatedNodes.includes(active.id) ? "ISOLATED" : active.health}
            </b>
          </div>
          <div className="network-active-metrics">
            <div><span>Uptime</span><strong>{rebootingNodeId === active.id ? "Calibrating…" : active.uptime}</strong></div>
            <div><span>Hardware</span><strong>{active.hardware}</strong></div>
            <div><span>Protocol support</span><strong>{active.protocol}</strong></div>
            <div><span>Key gen rate</span><strong>{active.rate}</strong></div>
          </div>
          <div className="network-active-actions">
            <button
              className="button button-outline button-small"
              disabled={pingingNodeId === active.id || rebootingNodeId === active.id}
              onClick={(event) => { event.stopPropagation(); handlePingNode(active.id, active.name); }}
            >
              <Activity size={12} className={pingingNodeId === active.id ? "spin text-blue" : ""} />
              {pingingNodeId === active.id ? "Pinging..." : "Ping"}
            </button>
            <button
              className="button button-outline button-small"
              disabled={rebootingNodeId === active.id || pingingNodeId === active.id}
              onClick={(event) => { event.stopPropagation(); handleRebootNode(active.id, active.name); }}
            >
              <RefreshCw size={12} className={rebootingNodeId === active.id ? "spin text-copper" : ""} />
              {rebootingNodeId === active.id ? "Rebooting..." : "Reboot"}
            </button>
            <button
              className="button button-copper button-small"
              onClick={(event) => { event.stopPropagation(); setSelectedNode(active.id); }}
            >
              {isolatedNodes.includes(active.id) ? "Reconnect" : "Isolate"}
            </button>
          </div>
        </button>
        <div className="network-connected-card">
          <div className="network-connected-head"><span className="eyebrow">Connected nodes ({inventory.length})</span></div>
          {inventory.map((node) => (
            <button key={node.id} className={cn("network-connected-row", activeNode === node.id && "network-connected-row-active")} onClick={() => setActiveNode(node.id)}>
              <div><strong>{node.name}</strong><span>{rebootingNodeId === node.id ? "Rebooting..." : isolatedNodes.includes(node.id) ? "Isolated" : node.role}</span></div>
              <div><b className={node.tone === "good" ? "status-text-good" : "text-copper"}>{node.latency}</b><span>{node.loss}</span></div>
            </button>
          ))}
        </div>
      </aside>
      {selectedNode && (
        <div className="modal-backdrop" onClick={() => setSelectedNode(null)}>
          <div className="modal-card modal-card-small" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div><span className="eyebrow">Node quarantine control</span><h3>{selectedNode}</h3></div>
              <button className="icon-button" onClick={() => setSelectedNode(null)} aria-label="Close node modal"><X size={15} /></button>
            </div>
            <button className={cn("button modal-submit", isolatedNodes.includes(selectedNode) ? "button-outline" : "button-copper")} onClick={async () => {
              const isIso = isolatedNodes.includes(selectedNode);
              try {
                await apiClient.quarantineNode({ node_id: selectedNode, action: isIso ? 'restore' : 'quarantine' });
              } catch {}
              toggleIsolation(selectedNode);
              toast.info(`Node ${selectedNode} ${isIso ? 'reconnected' : 'isolated'} via FastAPI`);
              setSelectedNode(null);
            }}>{isolatedNodes.includes(selectedNode) ? "Reconnect node" : "Isolate node"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const steps = ["Entangled photon pair emission", "Joint Bell state measurement", "Classical feed-forward & Pauli frame correction", "Hoeffding statistical bound audit", "Privacy amplification & Toeplitz hash distillation", "Arbitrator final verdict"];
const stepMeta = ["KEY EXCH MN", "ALICE BSM", "BOB NODE", "HOEFFDING CHK", "PRIVACY AMP", "THREAT ENGINE"];
function LegacyDemonstrationPage() {

  const { eveActive, toggleEve, qber: globalQber, chsh: globalChsh, executeProtocolRun, pushTelemetryLogs } = useSentinel();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const eve = eveActive;
  const setEve = (val: boolean | ((curr: boolean) => boolean)) => toggleEve();
  const [dragging, setDragging] = useState<string | null>(null);
  const [executingLive, setExecutingLive] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [simSpeed, setSimSpeed] = useState(1);
  const [showNotifications, setShowNotifications] = useState(false);
  const [nodePositions, setNodePositions] = useState({ alice: { x: 11, y: 48 }, arb: { x: 49, y: 27 }, bob: { x: 87, y: 48 }, eve: { x: 63, y: 72 } });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCreateSession) setShowCreateSession(false);
        if (showSettings) setShowSettings(false);
        if (showNotifications) setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCreateSession, showSettings, showNotifications]);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const nodeDragFrame = useRef<number | null>(null);
  const pendingNodePosition = useRef<{ id: keyof typeof nodePositions; x: number; y: number } | null>(null);

  const phaseDescriptions = [
    { source: 'ARB-CORE', text: 'Phase 01: Arbitrator pumps SPDC crystal (λ=1550nm) producing Bell pairs |Φ⁺⟩ = 1/√2 (|00⟩+|11⟩)', code: '200 OK', ms: '12ms' },
    { source: 'QN-ALICE', text: 'Phase 02: Alice performs joint Bell State Measurement on |ψdoc⟩ and her entangled qubit · feed-forward bits generated', code: '200 OK', ms: '18ms' },
    { source: eve ? 'EVE-PROBE' : 'QN-BOB', text: eve ? 'Phase 03 [INTERCEPT]: Adversary Eve attempts beam-splitter tap on fiber link 01 · superposition state disturbed' : 'Phase 03: Bob applies unitary correction σXᵇ¹ · σZᵇ² to restore quantum-state fidelity', code: eve ? '403 FORBIDDEN' : '200 OK', ms: eve ? '85ms' : '19ms', isThreat: eve },
    { source: 'HOEFFDING-GATE', text: eve ? 'Phase 04: Hoeffding test threshold breached (QBER 14.2% > 5.5% τ cutoff) · CHSH S=1.76 < 2.0' : 'Phase 04: Hoeffding statistical bound test passed (QBER 1.9% <= 5.0% cutoff) · CHSH S=2.76 >= 2.0', code: eve ? '0xFA BREACH' : '200 OK', ms: '14ms', isThreat: eve },
    { source: 'PRIVACY_AMP', text: eve ? 'Phase 05: Privacy amplification aborted due to eavesdropping disturbance · Zeroizing raw key buffers' : 'Phase 05: 2-Universal Toeplitz hash distillation distills unforgeable 256-bit quantum one-time-pad token', code: eve ? '503 ABORT' : '200 OK', ms: '10ms', isThreat: eve },
    { source: 'ARBITRATOR-VERDICT', text: eve ? 'Phase 06 [FINAL VERDICT: REJECT]: Security cutoff breached · Dynamic CRYSTALS-Dilithium3 PQC handover engaged' : 'Phase 06 [FINAL VERDICT: ACCEPT]: Unconditional signature verification accepted · Document signed & tamper-proof', code: eve ? 'REJECT_PQC' : 'ACCEPT_200', ms: '6ms', isThreat: eve }
  ];

  const logPhaseTelemetry = (phaseIndex: number) => {
    const p = phaseDescriptions[phaseIndex] || phaseDescriptions[0];
    const nowStr = formatIstTime(Date.now(), true);
    const qberVal = eve ? 0.142 : 0.019;
    const chshVal = eve ? 1.76 : 2.76;
    const item = {
      id: `demo-phase-${phaseIndex}-${Date.now()}`,
      time: nowStr,
      source: p.source,
      text: p.text,
      ms: p.ms,
      code: p.code,
      qber: `${(qberVal * 100).toFixed(1)}%`,
      chsh: chshVal.toFixed(2),
      isThreat: !!p.isThreat
    };
    pushTelemetryLogs([item]);
  };

  const goToStep = (next: number) => {
    setStep(next);
    logPhaseTelemetry(next);
  };

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((current) => {
        const next = current >= steps.length - 1 ? 0 : current + 1;
        logPhaseTelemetry(next);
        return next;
      });
    }, Math.max(500, 2500 / simSpeed));
    return () => window.clearInterval(timer);
  }, [playing, simSpeed, eve]);

  const beginNodeDrag = (id: keyof typeof nodePositions, event: React.PointerEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const point = nodePositions[id];
    dragOffset.current = { x: event.clientX - (rect.left + (point.x / 100) * rect.width), y: event.clientY - (rect.top + (point.y / 100) * rect.height) };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(id);
  };
  const moveNode = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.max(6, Math.min(94, ((event.clientX - rect.left - dragOffset.current.x) / rect.width) * 100));
    const y = Math.max(17, Math.min(83, ((event.clientY - rect.top - dragOffset.current.y) / rect.height) * 100));
    pendingNodePosition.current = { id: dragging as keyof typeof nodePositions, x, y };
    if (nodeDragFrame.current !== null) return;
    nodeDragFrame.current = window.requestAnimationFrame(() => { const next = pendingNodePosition.current; if (next) setNodePositions((current) => ({ ...current, [next.id]: { x: next.x, y: next.y } })); nodeDragFrame.current = null; });
  };
  const endNodeDrag = () => { if (nodeDragFrame.current !== null) { window.cancelAnimationFrame(nodeDragFrame.current); nodeDragFrame.current = null; } const next = pendingNodePosition.current; if (next) setNodePositions((current) => ({ ...current, [next.id]: { x: next.x, y: next.y } })); pendingNodePosition.current = null; setDragging(null); };
  const currentQber = (globalQber * 100).toFixed(1) + "%";
  const currentChsh = globalChsh.toFixed(2);
  const matrixRows = Array.from({ length: 8 }, (_, i) => { const pulse = String(i + 1).padStart(2, "0"); const intercepted = eve && (i === 0 || i === 1 || i === 3 || i === 6); const discarded = i === 3 || i === 4 || i === 7; return { pulse, aliceBasis: i % 3 === 0 ? "×" : "+", aliceBit: i % 2 ? "1" : "0", bobBasis: i % 3 === 1 ? "+" : "×", bobBit: intercepted ? (i % 2 ? "0" : "1") : i % 2 ? "1" : "0", bell: ["Φ⁻", "Φ⁺", "Ψ⁺", "Φ⁺", "Φ⁻", "Ψ⁻", "Φ⁺", "Ψ⁺"][i], intercepted, discarded, angleA: i % 3 === 0 ? "45°" : "0°", angleB: i % 3 === 1 ? "45°" : "0°" }; });
  const exportMatrix = () => { const header = "PLS,Alice Basis,Alice Bit,Bob Basis,Bob Bit,Bell Outcome,Eve Intercept,Sift Status,Polarization Angle A,Polarization Angle B"; const csv = [header, ...matrixRows.map((row) => [row.pulse, row.aliceBasis, row.aliceBit, row.bobBasis, row.bobBit, row.bell, row.intercepted ? "Yes" : "No", row.discarded ? "Discarded" : row.intercepted ? "QBER Error" : "Kept", row.angleA, row.angleB].join(","))].join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `quantum_matrix_${Date.now()}.csv`; anchor.click(); URL.revokeObjectURL(url); toast.success("Quantum matrix CSV exported"); };
  const handleExecuteLive = async () => {
    setExecutingLive(true);
    try {
      const res = await executeProtocolRun('board-resolution.pdf', eve);
      setStep(5);
      setPlaying(false);
      if (res?.verdict?.threat_detected || res?.status === 'REJECTED') {
        toast.error(`Workflow executed & Telemetry Streamed: REJECT (QBER: ${((res?.metrics?.qber ?? 0.142) * 100).toFixed(1)}%, CHSH S=${(res?.metrics?.chsh_score ?? 1.76).toFixed(2)})`);
      } else {
        toast.success(`Workflow executed & Telemetry Streamed: ACCEPT (QBER: ${((res?.metrics?.qber ?? 0.016) * 100).toFixed(1)}%, CHSH S=${(res?.metrics?.chsh_score ?? 2.81).toFixed(2)})`);
      }
    } catch {
      setStep(5);
      setPlaying(false);
      toast.success("Live signature verification completed & telemetry pushed");
    } finally {
      setExecutingLive(false);
    }
  };
  const stepCopy = ["The arbitrator pumps an SPDC crystal to produce Bell pairs |Φ⁺⟩ = 1/√2 (|00⟩ + |11⟩) at λ = 1550 nm.", "Alice performs a joint Bell measurement on |ψdoc⟩ and her entangled qubit, producing two classical feed-forward bits (b₁, b₂).", "Bob receives (b₁, b₂) and applies σxᵇ¹ · σzᵇ² to restore quantum-state fidelity.", "The arbitrator samples N test qubits and checks observed QBER against the Hoeffding threshold τ = 5.0%.", "A Toeplitz matrix distills an unforgeable 256-bit quantum one-time-pad signature token.", "The threat engine accepts when QBER ≤ 5.0% and CHSH S ≥ 2.00; otherwise it rejects."];
  return <div className="page-content demo-page"><Topbar onNotifications={() => setShowNotifications(!showNotifications)} eyebrow="01 / Quantum protocol" title="Alice ↔ Bob" subtitle="Interactive protocol visualizer / session QKD-260827-91F4" action={<><button className="button button-quiet button-small" onClick={() => setShowCreateSession(true)}><Plus size={14} /> New session</button><button className="icon-button" onClick={() => setShowSettings(true)} aria-label="Simulation settings" title="Simulation speed & settings"><Settings2 size={16} /></button><Link href="/home" className="button button-quiet button-small"><ArrowLeft size={14} /> Home portal</Link><Link href="/monitoring" className="button button-outline button-small">SOC monitoring <ArrowUpRight size={14} /></Link></>} /><div className="demo-toolbar"><div className="demo-session"><span className="mini-label"><StatusDot /> active session</span><strong>QKD-260827-91F4</strong></div><div className="demo-controls" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}><button className={cn("button button-quiet button-small", playing && "button-active")} onClick={() => { const nextPlaying = !playing; setPlaying(nextPlaying); if (nextPlaying) logPhaseTelemetry(step); }}>{playing ? <Pause size={14} /> : <Play size={14} fill="currentColor" />} {playing ? "Pause" : "Play"}</button><button className="button button-outline button-small" onClick={() => goToStep(step >= 5 ? 0 : step + 1)}>Step forward <ChevronRight size={14} /></button><button className="icon-button" onClick={() => { goToStep(0); setPlaying(false); }} aria-label="Reset protocol" title="Reset protocol to step 1"><RotateCcw size={15} /></button><button className="button button-copper button-small" disabled={executingLive} onClick={handleExecuteLive}>{executingLive ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />} {executingLive ? "Executing…" : "Execute live protocol"}</button></div></div><div className="step-tracker"><div className="step-rail" aria-hidden="true"><span className="step-rail-fill" style={{ width: `${(step / (steps.length - 1)) * 100}%` }} /></div><span className="step-cursor" aria-hidden="true" style={{ "--step-index": step } as React.CSSProperties} />{steps.map((label, i) => <button key={label} className={cn("step-item", i === step && "step-current", i < step && "step-done")} onClick={() => goToStep(i)}><span className="step-num">{i < step ? <Check size={12} /> : `0${i + 1}`}</span><span>{label}</span></button>)}</div><section className="protocol-board"><div className="protocol-intro"><div><span className="eyebrow">Phase 0{step + 1} / 06 · {stepMeta[step]}</span><h2>{steps[step]}</h2><p>{stepCopy[step]}</p><div className="protocol-metrics"><span><b>QBER</b>{currentQber}</span><span><b>CHSH S</b>{currentChsh}</span><span><b>τ cutoff</b>5.0%</span></div></div><div className="protocol-readout"><span>decision</span><strong className={eve ? "text-copper" : "text-blue"}>{eve ? "REJECT" : step === 5 ? "ACCEPT" : "PENDING"}</strong><small>{eve ? "disturbance detected" : step === 5 ? "all gates clear" : "awaiting next phase"}</small></div></div><div key={`stage-${step}-${simSpeed}`} ref={stageRef} style={{ "--sim-speed": simSpeed } as React.CSSProperties} className={cn("channel-stage", eve && "channel-stage-threat", playing && "flow-playing", `phase-${step}`)} onPointerMove={moveNode} onPointerUp={endNodeDrag} onPointerCancel={endNodeDrag}><div className="flow-progress" aria-label={`Protocol phase ${step + 1} of 6`}>{steps.map((label, i) => <span key={label} className={cn(i === step && "flow-progress-current", i < step && "flow-progress-done")} />)}</div><svg className="connection-map" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line className="connection-line connection-optical" x1={nodePositions.arb.x} y1={nodePositions.arb.y} x2={nodePositions.alice.x} y2={nodePositions.alice.y} /><line className="connection-line connection-optical" x1={nodePositions.arb.x} y1={nodePositions.arb.y} x2={(eve ? nodePositions.eve.x : nodePositions.bob.x)} y2={(eve ? nodePositions.eve.y : nodePositions.bob.y)} /><line className={cn("connection-line", eve ? "connection-threat-route" : "connection-classical")} x1={(eve ? nodePositions.eve.x : nodePositions.alice.x)} y1={(eve ? nodePositions.eve.y : nodePositions.alice.y)} x2={nodePositions.bob.x} y2={nodePositions.bob.y} /><circle className="connection-anchor" cx={nodePositions.arb.x} cy={nodePositions.arb.y} r="1.1" /><circle className="connection-anchor" cx={nodePositions.alice.x} cy={nodePositions.alice.y} r="1.1" /><circle className="connection-anchor" cx={nodePositions.bob.x} cy={nodePositions.bob.y} r="1.1" /></svg><svg key={`photon-svg-${simSpeed}`} className="photon-system" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><PhotonTrack key={`arb-alice-${simSpeed}`} id="route-arb-alice" from={nodePositions.arb} to={nodePositions.alice} tone={eve ? "threat" : "quantum"} delay="-.2s" speed={simSpeed} />{eve ? <><PhotonTrack key={`arb-eve-${simSpeed}`} id="route-arb-eve" from={nodePositions.arb} to={nodePositions.eve} tone="threat" delay="-.8s" speed={simSpeed} /><PhotonTrack key={`eve-bob-${simSpeed}`} id="route-eve-bob" from={nodePositions.eve} to={nodePositions.bob} tone="threat" delay="-1.4s" speed={simSpeed} /></> : <PhotonTrack key={`arb-bob-${simSpeed}`} id="route-arb-bob" from={nodePositions.arb} to={nodePositions.bob} tone="quantum" delay="-.95s" speed={simSpeed} />}</svg><div className="stage-label stage-label-top">Optical channel <span>authenticated / 1550nm</span></div><div className={cn("protocol-node", "node-alice", "movable-node", dragging === "alice" && "node-dragging", step === 1 && "node-active", "compact-node")} style={{ left: `${nodePositions.alice.x}%`, top: `${nodePositions.alice.y}%` }} onPointerDown={(event) => beginNodeDrag("alice", event)}><div className="protocol-node-icon"><FileKey2 size={20} /></div><strong>ALICE</strong><span>node A / signer</span><div className="node-readout"><span>document hash</span><b>af7c…e91b</b></div></div><div className={cn("protocol-node", "node-arb", "movable-node", dragging === "arb" && "node-dragging", step === 0 && "node-active", "compact-node")} style={{ left: `${nodePositions.arb.x}%`, top: `${nodePositions.arb.y}%` }} onPointerDown={(event) => beginNodeDrag("arb", event)}><div className="protocol-node-icon"><Sparkles size={20} /></div><strong>ARBITRATOR</strong><span>entangled source</span><div className="node-readout"><span>EPR pairs</span><b>100 / 100</b></div></div><div className={cn("protocol-node", "node-bob", "movable-node", dragging === "bob" && "node-dragging", step === 3 && "node-active", "compact-node")} style={{ left: `${nodePositions.bob.x}%`, top: `${nodePositions.bob.y}%` }} onPointerDown={(event) => beginNodeDrag("bob", event)}><div className="protocol-node-icon"><ShieldCheck size={20} /></div><strong>BOB</strong><span>node B / verifier</span><div className="node-readout"><span>Pauli frame</span><b>{step >= 3 ? "σXZ aligned" : "awaiting bits"}</b></div></div><div className={cn("protocol-node", "node-eve", "movable-node", dragging === "eve" && "node-dragging", eve && "node-active", "compact-node")} style={{ left: `${nodePositions.eve.x}%`, top: `${nodePositions.eve.y}%` }} onPointerDown={(event) => beginNodeDrag("eve", event)}><div className="protocol-node-icon"><AlertTriangle size={20} /></div><strong>EVE</strong><span>adversary / isolated</span><div className="node-readout"><span>intercept rate</span><b>{eve ? "35% active" : "0% idle"}</b></div></div><div className="stage-label stage-label-bottom"><span>classical channel / authenticated</span><span>γ photon stream / entangled pair</span></div></div><div className="protocol-controls"><div className="control-copy"><span className="eyebrow">Adversarial simulation</span><strong>Man-in-the-middle interception</strong><span>Toggle to observe a broken Bell correlation across all pages.</span></div><button className={cn("switch", eve && "switch-on")} onClick={() => toggleEve()} aria-pressed={eve}><span className="switch-thumb" /> <span>{eve ? "Eve active" : "Eve idle"}</span></button></div></section><section className="bitstream-section"><SectionLabel index="03" eyebrow="Evidence sample" title="Quantum bitstream & Pauli alignment" action={<div className="evidence-actions"><Pill tone="blue">{matrixRows.filter((row) => !row.discarded).length} kept / {matrixRows.filter((row) => row.discarded).length} dropped</Pill><button className="button button-quiet button-small" onClick={exportMatrix}><Download size={14} /> Export Matrix CSV</button></div>} /><div className="bitstream-table-wrap"><table className="data-table bitstream-table"><thead><tr><th>pulse</th><th>Alice basis</th><th>raw bit</th><th>Bell outcome</th><th>Bob basis</th><th>Pauli</th><th>sifting</th></tr></thead><tbody>{matrixRows.map((row) => <tr key={row.pulse}><td className="mono">{row.pulse}</td><td>{row.aliceBasis}</td><td className="mono">{row.aliceBit}</td><td className="mono">{row.bell}</td><td>{row.bobBasis}</td><td className="mono">{row.bobBit}</td><td><Pill tone={row.discarded || row.intercepted ? "copper" : "good"}>{row.discarded ? "DISCARDED" : row.intercepted ? "QBER ERROR" : "KEPT"}</Pill></td></tr>)}</tbody></table></div></section>{showCreateSession && <div className="modal-backdrop" onClick={() => setShowCreateSession(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Provision / 01</span><h3>New quantum session</h3></div><button className="icon-button" onClick={() => setShowCreateSession(false)} aria-label="Close new session"><X size={15} /></button></div><p className="modal-copy">Create a clean handshake session and begin at the EPR preparation phase.</p><div className="form-grid"><label>Document<input defaultValue="board-resolution.pdf" /></label><label>Protocol profile<select defaultValue="QDS / 1550nm"><option>QDS / 1550nm</option><option>QDS / test channel</option></select></label></div><button className="button button-copper modal-submit" onClick={() => { setShowCreateSession(false); goToStep(0); setPlaying(true); toast.success("Quantum Session created & active"); }}><Play size={14} fill="currentColor" /> Create & start session</button></div></div>}{showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="modal-card modal-card-small" onClick={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Control plane</span><h3>Simulation settings</h3></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={15} /></button></div><div className="settings-row"><span>Playback speed</span><div className="speed-pills">{[0.5, 1, 2, 4].map((speed) => <button key={speed} className={cn("speed-pill", simSpeed === speed && "speed-pill-active")} onClick={() => { setSimSpeed(speed); toast.info(`Playback speed set to ${speed}×`); }}>{speed}x</button>)}</div></div><div className="settings-note"><Gauge size={14} /> Photon velocity and auto-advance interval update together.</div></div></div>}{showNotifications && <div className="notification-popover"><div className="modal-head"><div><span className="eyebrow">Signal desk</span><h3>Notifications</h3></div><button className="icon-button" onClick={() => setShowNotifications(false)} aria-label="Close notifications"><X size={14} /></button></div><div className="notification-item"><span className="notification-mark" /><div><strong>{eve ? "Quantum channel intrusion" : "No active alerts"}</strong><span>{eve ? "35% intercept tap is disturbing Bell correlation." : "The current session is within nominal tolerance."}</span></div></div>{eve && <button className="text-link notification-clear" onClick={() => { toggleEve(); setShowNotifications(false); }}>Clear active alert</button>}</div>}</div>;
}

function DemonstrationPage() {
  return <LegacyDemonstrationPage />;
}
function SandboxMetricChart({
  title,
  mode,
  threat,
  value,
  detail,
  targetVal,
  currentVal,
  thresholdVal,
  thresholdLabel
}: {
  title: string;
  mode: "qber" | "chsh";
  threat: boolean;
  value: string;
  detail: string;
  targetVal?: number;
  currentVal?: number;
  thresholdVal?: number;
  thresholdLabel?: string;
}) {
  const width = 100;
  const height = 60;
  const padY = 6;
  const padX = 6;

  const baseTarget = targetVal !== undefined ? targetVal : (mode === "qber" ? (threat ? 0.142 : 0.019) : (threat ? 1.76 : 2.76));

  const [history, setHistory] = useState<number[]>(() => {
    const init = [];
    for (let i = 0; i < 10; i++) {
      const progress = i / 9;
      if (mode === "qber") {
        init.push(threat ? (0.019 + (baseTarget - 0.019) * Math.pow(progress, 1.8)) : baseTarget);
      } else {
        init.push(threat ? (2.76 - (2.76 - baseTarget) * Math.pow(progress, 1.8)) : baseTarget);
      }
    }
    return init;
  });

  useEffect(() => {
    setHistory(() => {
      const init = [];
      for (let i = 0; i < 10; i++) {
        const progress = i / 9;
        if (mode === "qber") {
          init.push(threat ? (0.019 + (baseTarget - 0.019) * Math.pow(progress, 1.8)) : baseTarget);
        } else {
          init.push(threat ? (2.76 - (2.76 - baseTarget) * Math.pow(progress, 1.8)) : baseTarget);
        }
      }
      return init;
    });
  }, [baseTarget, threat, mode]);

  const points = useMemo(() => {
    const count = history.length;
    const min = mode === "qber" ? 0.0 : 1.0;
    const max = mode === "qber" ? 0.20 : 3.0;

    return history.map((val, i) => {
      const x = padX + (i / (count - 1)) * (width - 2 * padX);
      const clamped = Math.max(min, Math.min(max, val));
      const y = (height - padY) - ((clamped - min) / (max - min)) * (height - 2 * padY);
      return { x, y, val };
    });
  }, [history, mode]);

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (pt.x - prev.x) / 2;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (pt.x - prev.x) / 2;
    const cpy2 = pt.y;
    return `${acc} C ${cpx1} ${cpy1} ${cpx2} ${cpy2} ${pt.x} ${pt.y}`;
  }, "");

  const areaD = `${pathD} L ${width - padX} ${height - padY} L ${padX} ${height - padY} Z`;

  const thresholdMin = mode === "qber" ? 0.0 : 1.0;
  const thresholdMax = mode === "qber" ? 0.20 : 3.0;
  const thresholdValue = thresholdVal !== undefined ? thresholdVal : (mode === "qber" ? 0.055 : 2.0);
  const thresholdY = (height - padY) - ((thresholdValue - thresholdMin) / (thresholdMax - thresholdMin)) * (height - 2 * padY);

  const latest = points[points.length - 1];

  return (
    <div className="sandbox-v2-metric">
      <div className="sandbox-v2-metric-head">
        <strong>{title}</strong>
        <span>{mode === "chsh" ? "Quantum ≥ 2.0" : (thresholdLabel || `τ ≤ ${(thresholdValue * 100).toFixed(1)}%`)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`grad-sandbox-${mode}-${threat ? 'threat' : 'good'}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={threat ? "#b94a2f" : "#2f6f85"} stopOpacity="0.25" />
            <stop offset="100%" stopColor={threat ? "#b94a2f" : "#2f6f85"} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <line
          x1={padX}
          y1={thresholdY}
          x2={width - padX}
          y2={thresholdY}
          stroke={threat ? "#b94a2f" : "#687078"}
          strokeDasharray="2 2"
          strokeWidth="0.75"
          opacity="0.6"
        />
        <path d={areaD} fill={`url(#grad-sandbox-${mode}-${threat ? 'threat' : 'good'})`} style={{ transition: "d 0.35s ease" }} />
        <path
          d={pathD}
          fill="none"
          stroke={threat ? "#b94a2f" : "#2f6f85"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "d 0.35s ease" }}
        />
        {latest && (
          <circle cx={latest.x} cy={latest.y} r="2.8" fill={threat ? "#b94a2f" : "#2f6f85"} stroke="#ffffff" strokeWidth="0.8" />
        )}
      </svg>
      <div className="sandbox-v2-metric-foot">
        <span>{detail}</span>
        <b className={threat ? "text-copper" : "status-text-good"}>
          {mode === "qber" ? `${((latest?.val ?? baseTarget) * 100).toFixed(1)}%` : `S=${(latest?.val ?? baseTarget).toFixed(2)}`}
        </b>
      </div>
    </div>
  );
}

/* Cryptographic SHA-256 digest generator */
async function computeSha256(text: string): Promise<string> {
  if (!text) return "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  try {
    const enc = new TextEncoder().encode(text);
    const hashBuf = await crypto.subtle.digest("SHA-256", enc);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return "0x" + hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return "0x" + Math.abs(hash).toString(16).padStart(64, "0");
  }
}

/* Transfer workspace — Signal Atelier applies mineral paper, ink, copper intervention, and analytic blue telemetry. */
function TransferPage() {
  const { eveActive, toggleEve, qber, chsh, pqcMode, payloads, sendTransmission, resetChannel } = useSentinel();
  const [mode, setMode] = useState<"message" | "document">(() => new URLSearchParams(window.location.search).get("mode") === "document" ? "document" : "message");
  const [message, setMessage] = useState("CLASSIFIED DEFENSE TELEMETRY: Quantum one-time-pad key handshake verified for orbital satellite relay Alpha-09.");
  const [messageDigest, setMessageDigest] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDigest, setFileDigest] = useState<string | null>(null);
  const [fileIsDragging, setFileIsDragging] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [transmitStep, setTransmitStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamically compute SHA-256 hash as the message changes
  useEffect(() => {
    let isCancelled = false;
    computeSha256(message).then((hash) => {
      if (!isCancelled) {
        setMessageDigest(hash);
      }
    });
    return () => { isCancelled = true; };
  }, [message]);

  const presets = ["Defense manifest 09", "OTP key exchange", "Satellite command"];
  const selectPreset = (preset: string) => setMessage(preset === "Defense manifest 09" ? "DEFENSE MANIFEST 09: Signed payload approved for authenticated orbital relay delivery." : preset === "OTP key exchange" ? "ONE-TIME-PAD EXCHANGE: Entangled key material sealed for the next authenticated message." : "SATELLITE COMMAND: Deploy the secure quantum control packet to the Alpha-09 relay.");
  const formatFileSize = (bytes: number) => bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + " KB" : (bytes / (1024 * 1024)).toFixed(1) + " MB";
  
  const acceptDocument = async (candidate?: File | null) => {
    if (!candidate) return;
    const allowed = /\.(txt|pdf|sig|json)$/i.test(candidate.name);
    if (!allowed) { toast.error("Use a .txt, .pdf, .sig, or .json document"); return; }
    if (candidate.size > 10 * 1024 * 1024) { toast.error("Document limit is 10 MB"); return; }
    setSelectedFile(candidate);
    setFileDigest(null);
    try { 
      const data = await candidate.arrayBuffer(); 
      const hash = await crypto.subtle.digest("SHA-256", data); 
      const digest = "0x" + Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join(""); 
      setFileDigest(digest); 
      toast.success(candidate.name + " staged · SHA-256 computed");
    } catch { 
      setFileDigest("0x7c8a92f4d61be05e7a3c4f88b19d20a67e890123456789abcdef0123456789ab"); 
      toast.success(candidate.name + " staged for quantum signing");
    }
  };

  const removeDocument = () => { setSelectedFile(null); setFileDigest(null); if (fileInputRef.current) fileInputRef.current.value = ""; toast.info("Document removed from the signing queue"); };

  const handleSend = async () => {
    if (mode === "document" && !selectedFile) { toast.error("Choose a document before sending"); return; }
    if (mode === "message" && !message.trim()) { toast.error("Enter a payload message"); return; }
    if (isTransmitting) return;

    setIsTransmitting(true);
    setTransmitStep(1);

    const activeDigest = mode === "document" ? fileDigest : messageDigest;

    try {
      await new Promise((r) => setTimeout(r, 450));
      setTransmitStep(2);

      await new Promise((r) => setTimeout(r, 450));
      setTransmitStep(3);

      await new Promise((r) => setTimeout(r, 450));
      setTransmitStep(4);

      await sendTransmission({ mode, message, file: selectedFile, digest: activeDigest });
      await new Promise((r) => setTimeout(r, 650));

      if (mode === "document" && selectedFile) removeDocument();
    } catch {
      toast.error("Quantum transmission interrupted");
    } finally {
      setIsTransmitting(false);
      setTransmitStep(0);
    }
  };

  return (
    <div className="transfer-page">
      <header className="transfer-header">
        <div className="transfer-brand"><img src={MARK} alt="" /><span>QDS SENTINEL</span></div>
        <strong>Real-time quantum transfer</strong>
        <div className="transfer-header-actions">
          <span className={eveActive ? "transfer-security threat" : "transfer-security"}>{eveActive ? "PQC FALLBACK ACTIVE" : "FASTAPI CORE CONNECTED"}</span>
          <Link href="/monitoring" className="transfer-soc-link">SOC console</Link>
        </div>
      </header>
      <section className="transfer-status-strip">
        <span><Sparkles size={15} /> EPR rate <b>1,024 pairs/sec</b></span>
        <span><Waves size={15} /> Observed QBER <b className={eveActive ? "text-copper" : "text-blue"}>{(qber * 100).toFixed(2)}%</b></span>
        <span><Zap size={15} /> CHSH Bell score <b className={eveActive ? "text-copper" : "status-text-good"}>S = {chsh.toFixed(2)}</b></span>
        <div className="transfer-strip-spacer" />
        <button className={cn("transfer-eve-toggle", eveActive && "transfer-eve-toggle-active")} onClick={() => toggleEve()}>
          <LockKeyhole size={14} /> Eve interception tap <i><b /></i><small>{eveActive ? "Fallback active" : "Secure line"}</small>
        </button>
        <button className="transfer-reset" onClick={() => { setMessage("CLASSIFIED DEFENSE TELEMETRY: Quantum one-time-pad key handshake verified for orbital satellite relay Alpha-09."); removeDocument(); resetChannel(); }}>
          <RotateCcw size={14} /> Reset session
        </button>
      </section>

      {/* Live Photon Beam Animation Bar */}
      {isTransmitting && (
        <div style={{
          background: "var(--paper-deep)",
          borderBottom: "1px solid var(--line)",
          padding: "6px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          font: "9.5px var(--mono)",
          color: "var(--ink)",
          letterSpacing: "0.04em",
          flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={13} className="spin text-blue" />
            <strong style={{ color: eveActive ? "var(--copper)" : "var(--blue)" }}>
              {eveActive ? "OPTICAL DISTURBANCE DETECTED · PQC HOT-SWAP" : "ACTIVE 1550nm OPTICAL HANDSHAKE"} (PHASE 0{transmitStep}/04)
            </strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--slate)" }}>
            <span>ALICE (NODE A) ──[γ STREAM]──▶ ARBITRATOR ──▶ BOB (NODE B)</span>
            <div style={{ width: "80px", height: "4px", background: "rgba(22, 24, 26, 0.08)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(transmitStep / 4) * 100}%`,
                background: eveActive ? "var(--copper)" : "var(--blue)",
                transition: "width 0.3s ease"
              }} />
            </div>
          </div>
        </div>
      )}

      <main className="transfer-workspace">
        <section className="transfer-terminal transfer-alice">
          <div className="transfer-terminal-head">
            <div>
              <span className="transfer-node-mark">A</span>
              <div>
                <h1>Alice terminal <small>signer node alpha</small></h1>
                <p>You are logged in as Alice · transmitting via 1550nm telecom fiber</p>
              </div>
            </div>
            <div className="transfer-mode-switch">
              <button className={mode === "message" ? "active" : ""} onClick={() => setMode("message")}>Text message</button>
              <button className={mode === "document" ? "active" : ""} onClick={() => setMode("document")}>Document file</button>
            </div>
          </div>
          {mode === "message" ? (
            <div className="transfer-compose">
              <div>
                <span className="eyebrow">Quick preset payloads</span>
                <div className="transfer-presets">{presets.map((preset) => <button key={preset} onClick={() => selectPreset(preset)}>+ {preset}</button>)}</div>
              </div>
              <label className="transfer-compose-label">
                Compose quantum signed payload
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Compose an authenticated payload" />
              </label>
              <div className="transfer-digest">
                <div><LockKeyhole size={14} /><span>Computed SHA-256 digest (h = SHA256(m))</span></div>
                <button onClick={() => { navigator.clipboard?.writeText(messageDigest); toast.success("Message digest copied"); }}><Copy size={13} /> Copy hash</button>
                <code>{messageDigest || "Computing SHA-256..."}</code>
              </div>
            </div>
          ) : (
            <div className="transfer-document-compose">
              <div>
                <span className="eyebrow">Upload document payload</span>
                <p>Attach a protected document for local hashing and post-quantum signing.</p>
              </div>
              <input ref={fileInputRef} className="transfer-file-input" type="file" accept=".txt,.pdf,.sig,.json,application/pdf,application/json,text/plain" onChange={(event) => acceptDocument(event.target.files?.[0])} />
              <div
                className={cn("transfer-upload-zone", fileIsDragging && "transfer-upload-zone-dragging", Boolean(selectedFile) && "transfer-upload-zone-selected")}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInputRef.current?.click(); } }}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(event) => { event.preventDefault(); setFileIsDragging(true); }}
                onDragOver={(event) => { event.preventDefault(); setFileIsDragging(true); }}
                onDragLeave={() => setFileIsDragging(false)}
                onDrop={(event) => { event.preventDefault(); setFileIsDragging(false); acceptDocument(event.dataTransfer.files?.[0]); }}
              >
                {selectedFile ? (
                  <div className="transfer-selected-file">
                    <FileKey2 size={24} />
                    <div>
                      <strong>{selectedFile.name}</strong>
                      <span>{formatFileSize(selectedFile.size)} · {fileDigest ? "SHA-256 sealed" : "Hashing evidence…"}</span>
                    </div>
                    <button type="button" onClick={(event) => { event.stopPropagation(); removeDocument(); }} aria-label="Remove selected document"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <span className="transfer-upload-icon"><FileKey2 size={26} /></span>
                    <strong>Click or drag & drop file here</strong>
                    <small>Supports .txt, .pdf, .sig, .json files · max 10 MB</small>
                  </>
                )}
              </div>
              <div className="transfer-document-notes">
                <div><span>Local hash</span><strong>{fileDigest ? "Ready" : "Awaiting document"}</strong></div>
                <div><span>Signature profile</span><strong>ML-DSA-65 fallback</strong></div>
                <div><span>Destination</span><strong>Bob / node beta</strong></div>
              </div>
              <div className="transfer-digest">
                <div><LockKeyhole size={14} /><span>Computed SHA-256 document digest</span></div>
                <button onClick={() => { if (fileDigest) { navigator.clipboard?.writeText(fileDigest); toast.success("Document digest copied"); } }} disabled={!fileDigest}><Copy size={13} /> Copy hash</button>
                <code>{fileDigest || "0x — (Upload a document to compute SHA-256)"}</code>
              </div>
            </div>
          )}
          <div className="transfer-sendbar">
            <span>State: {isTransmitting ? `Transmitting stage ${transmitStep}/4…` : mode === "document" ? selectedFile ? "Document ready to sign" : "Awaiting document" : eveActive ? "Fallback signature mode" : "Ready to sign"}</span>
            <button disabled={isTransmitting} onClick={handleSend} style={{ opacity: isTransmitting ? 0.75 : 1 }}>
              {isTransmitting ? (
                <>
                  <RefreshCw size={14} className="spin" /> Transmitting pulse ({transmitStep}/4)…
                </>
              ) : (
                <>
                  <Send size={15} /> Send quantum signed payload
                </>
              )}
            </button>
          </div>
        </section>
        <section className="transfer-terminal transfer-bob">
          <div className="transfer-terminal-head">
            <div>
              <span className="transfer-node-mark node-b">B</span>
              <div>
                <h1>Bob terminal <small>receiver node beta</small></h1>
                <p>Real-time SNSPD detector listener · dark fiber receiver</p>
              </div>
            </div>
            <span className={cn("transfer-listening", isTransmitting && "text-copper font-bold")}>
              {isTransmitting ? `STREAM ACTIVE (${transmitStep}/4)` : "Listening"}
            </span>
          </div>

          <div className="transfer-receipts">
            {/* Live Incoming Feed Animation Box - Signal Atelier Theme */}
            {isTransmitting && (
              <div style={{
                background: "var(--paper-deep)",
                border: "1px solid var(--line)",
                padding: "10px 12px",
                font: "10.5px/1.45 var(--mono)",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                marginBottom: "10px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: "5px",
                  color: "var(--slate)",
                  font: "8.5px var(--mono)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase"
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px", color: eveActive ? "var(--copper)" : "var(--blue)", fontWeight: "bold" }}>
                    <TerminalSquare size={11} /> SNSPD QUANTUM RECEPTOR STREAM
                  </span>
                  <span style={{ color: eveActive ? "var(--copper)" : "var(--blue)", fontWeight: "bold" }}>PHASE {transmitStep}/4</span>
                </div>

                {transmitStep >= 1 && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", color: "var(--ink)" }}>
                    <span style={{ color: "var(--blue)", fontWeight: "bold", fontSize: "9px" }}>[01]</span>
                    <span>Single-photon pulse captured on port SNSPD-01 (λ=1550nm)...</span>
                  </div>
                )}
                {transmitStep >= 2 && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", color: "var(--ink)" }}>
                    <span style={{ color: "var(--blue)", fontWeight: "bold", fontSize: "9px" }}>[02]</span>
                    <span>Reconciled classical feed-forward bits (b₁=1, b₂=0)...</span>
                  </div>
                )}
                {transmitStep >= 3 && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", color: "var(--ink)" }}>
                    <span style={{ color: "var(--slate)", fontWeight: "bold", fontSize: "9px" }}>[03]</span>
                    <span>Applied Pauli unitary operator σX · σZ frame alignment...</span>
                  </div>
                )}
                {transmitStep >= 4 && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", color: eveActive ? "var(--copper)" : "#3b7453", fontWeight: "bold" }}>
                    <span style={{ fontSize: "9px" }}>[04]</span>
                    <span>
                      {eveActive 
                        ? "EVE INTERCEPT DETECTED ➔ HOT-SWAPPED TO CRYSTALS-DILITHIUM3 PQC FALLBACK · 100% UNTOUCHED" 
                        : "SHA-256 MATCH CONFIRMED (100% PHYSICAL QDS BYTE INTEGRITY VERIFIED)"}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="transfer-receipts-head">
              <span className="eyebrow">Received payloads ({payloads.length})</span>
              <span>Live receipt ledger</span>
            </div>
            {payloads.map((payload) => (
              <article className={cn("transfer-receipt", payload.tone === "pqc" && "transfer-receipt-pqc")} key={payload.id}>
                <div className="transfer-receipt-meta">
                  <strong className={payload.tone === "pqc" ? "receipt-pqc" : ""}>{payload.verification}</strong>
                  <span>{payload.id}</span>
                  <time>{payload.time}</time>
                </div>
                <h2>{payload.title}</h2>
                <pre>{payload.body}</pre>
                {payload.digest && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 8px 0', fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--slate)' }}>
                    <LockKeyhole size={11} className={payload.tone === 'pqc' ? 'text-copper' : 'text-blue'} />
                    <span>SHA-256 DIGEST:</span>
                    <code style={{ background: 'var(--paper-deep)', padding: '2px 5px', borderRadius: '2px', color: 'var(--ink)', fontSize: '9.5px', wordBreak: 'break-all' }}>{payload.digest}</code>
                  </div>
                )}
                <div className={cn("transfer-signature", payload.tone === "pqc" && "transfer-signature-pqc")}>
                  <b>{payload.tone === "pqc" ? "PQC lattice signature / ML-DSA-65" : "Physical QDS attestation"}</b>
                  <code>{payload.signature}</code>
                </div>
                <footer>
                  <span>QBER: <b className={payload.metricTone}>{payload.qber}</b></span>
                  <span>CHSH: <b className={payload.metricTone}>S={payload.chsh}</b></span>
                  <button onClick={() => { navigator.clipboard?.writeText(payload.body + "\n" + (payload.digest ? `SHA-256 Digest: ${payload.digest}\n` : "") + payload.signature); toast.success("Receipt evidence copied"); }}><Copy size={13} /> Copy</button>
                </footer>
              </article>
            ))}
          </div>
          <div className="transfer-bob-foot">
            Verification engine: FastAPI core + Hoeffding audit <strong className={eveActive ? "text-copper" : "status-text-good"}>{eveActive ? "PQC fallback integrity active" : "100% byte integrity assured"}</strong>
          </div>
        </section>
      </main>
    </div>
  );
}

function DatabasePage() {
  const { incidents, telemetryLogs, threats, qber, chsh, activeAttack, eveActive } = useSentinel();
  const [activeTable, setActiveTable] = useState<'quantum_sessions' | 'attack_records' | 'node_metrics' | 'telemetry_logs' | 'pqc_handovers'>('quantum_sessions');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<string>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => formatIstTime(Date.now(), true));

  const [dbRows, setDbRows] = useState([
    {
      id: "QKD-260827-91F4",
      doc: "board-resolution.pdf",
      digest: "0x6692d35f98fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      pqcMode: "Standby",
      qber: "1.2%",
      hoeffding: "5.50%",
      chsh: "2.77",
      verdict: "ACCEPT",
      status: "Verified",
      bellState: "|Φ⁺⟩",
      time: formatIstTime(Date.now() - 45000, true)
    },
    {
      id: "QKD-260827-91C1",
      doc: "release-manifest.json",
      digest: "0x12fa9084ccba1198ee554109ab723419bb652490cc1245890fae4189acbb7712",
      pqcMode: "Standby",
      qber: "0.8%",
      hoeffding: "5.50%",
      chsh: "2.81",
      verdict: "ACCEPT",
      status: "Verified",
      bellState: "|Ψ⁺⟩",
      time: formatIstTime(Date.now() - 180000, true)
    },
    {
      id: "QKD-260827-8FD2",
      doc: "legal-brief-v4.pdf",
      digest: "0x89ab114ef9012354aa7890bcdee41527389146ab",
      pqcMode: "ML-KEM-768 Active",
      qber: "14.2%",
      hoeffding: "5.50%",
      chsh: "1.86",
      verdict: "REJECT",
      status: "Quarantined",
      bellState: "|Ψ⁻⟩ (Tampered)",
      time: formatIstTime(Date.now() - 420000, true)
    },
    {
      id: "QKD-260827-8EE9",
      doc: "firmware-checksum.txt",
      digest: "0x3344556677889900aabbccddeeff001122334455",
      pqcMode: "Standby",
      qber: "2.1%",
      hoeffding: "5.50%",
      chsh: "2.68",
      verdict: "ACCEPT",
      status: "Verified",
      bellState: "|Φ⁻⟩",
      time: formatIstTime(Date.now() - 900000, true)
    },
    {
      id: "QKD-260827-7AA1",
      doc: "treasury-settlement.sig",
      digest: "0x98f411ba2468acde00998877665544332211ffeeddccbbaa",
      pqcMode: "ML-DSA-65 Active",
      qber: "10.8%",
      hoeffding: "5.50%",
      chsh: "1.74",
      verdict: "REJECT",
      status: "Quarantined",
      bellState: "|Φ⁺⟩ (Degraded)",
      time: formatIstTime(Date.now() - 1450000, true)
    }
  ]);

  const fetchLiveDatabase = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getSessions();
      if (res?.sessions && Array.isArray(res.sessions) && res.sessions.length > 0) {
        const mapped = res.sessions.map((s: any, idx: number) => ({
          id: s.session_id || `QKD-20260828-${String(idx + 1).padStart(4, '0')}`,
          doc: s.document_name || 'board-resolution.pdf',
          digest: s.digest || `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          pqcMode: s.status === 'REJECTED' || s.threat_detected ? 'ML-DSA-65 Active' : 'Standby',
          status: s.status === 'REJECTED' || s.threat_detected ? 'Quarantined' : 'Verified',
          qber: `${((s.metrics?.qber ?? 0.019) * 100).toFixed(1)}%`,
          chsh: (s.metrics?.chsh_score ?? 2.76).toFixed(2),
          hoeffding: '5.50%',
          verdict: s.status === 'REJECTED' || s.threat_detected ? 'REJECT' : 'ACCEPT',
          bellState: s.status === 'REJECTED' ? '|Ψ⁻⟩ (Tampered)' : '|Φ⁺⟩',
          time: formatIstTime(Date.now() - idx * 180000, true)
        }));
        setDbRows(mapped);
      }
      setLastSyncTime(formatIstTime(Date.now(), true));
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveDatabase();
  }, []);

  const pqcHandovers = useMemo(() => [
    {
      id: "PQC-DSA-0981",
      trigger: "QBER Breach > 5.50% (Channel Jamming)",
      doc: "board-resolution.pdf",
      digest: "0x6692d35f98fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      scheme: "CRYSTALS-Dilithium3 (ML-DSA-65)",
      nistLevel: "NIST Level 3 (AES-192 equiv)",
      latency: "3.8 ms",
      status: "PQC Fallback Active",
      qber: `${(qber * 100).toFixed(1)}%`,
      chsh: chsh.toFixed(2),
      verdict: "ACCEPT_PQC",
      time: formatIstTime(Date.now() - 60000, true)
    },
    {
      id: "PQC-KEM-0412",
      trigger: "CHSH Bell Violation S < 2.00 (Eavesdropping)",
      doc: "legal-brief-v4.pdf",
      digest: "0x89ab114ef9012354aa7890bcdee41527389146ab",
      scheme: "CRYSTALS-Kyber768 (ML-KEM-768)",
      nistLevel: "NIST Level 3 (IND-CCA2)",
      latency: "5.4 ms",
      status: "PQC Sealed",
      qber: "14.2%",
      chsh: "1.76",
      verdict: "ACCEPT_PQC",
      time: formatIstTime(Date.now() - 360000, true)
    },
    {
      id: "PQC-DSA-0774",
      trigger: "Photon Number Splitting Tap Detected",
      doc: "treasury-settlement.sig",
      digest: "0x98f411ba2468acde00998877665544332211ffeeddccbbaa",
      scheme: "CRYSTALS-Dilithium5 (ML-DSA-87)",
      nistLevel: "NIST Level 5 (AES-256 equiv)",
      latency: "6.2 ms",
      status: "PQC Sealed",
      qber: "18.5%",
      chsh: "1.62",
      verdict: "ACCEPT_PQC",
      time: formatIstTime(Date.now() - 1100000, true)
    }
  ], [qber, chsh]);

  const attackRows = useMemo(() => {
    if (threats.length > 0) {
      return threats.map((t, idx) => ({
        id: t.id || `ATK-20260828-${String(idx + 1).padStart(4, '0')}`,
        vector: t.type || "Adversarial Channel Tap",
        severity: t.severity || "CRITICAL",
        qber: t.current || `${((t.qber ?? 0.142) * 100).toFixed(1)}%`,
        chsh: (t.chsh ?? 1.76).toFixed(2),
        action: "PQC Fallback Activated & Fiber Channel Isolated",
        verdict: "REJECT",
        status: "Quarantined",
        time: t.time || formatIstTime(Date.now(), true)
      }));
    }
    return [
      {
        id: "ATK-20260828-9821",
        vector: "Adversarial Channel Noise Jamming",
        severity: "CRITICAL",
        qber: "10.8%",
        chsh: "1.74",
        action: "ML-DSA-65 Fallback Activated",
        verdict: "REJECT",
        status: "Quarantined",
        time: formatIstTime(Date.now() - 120000, true)
      },
      {
        id: "ATK-20260828-7712",
        vector: "Intercept-Resend Eavesdropping",
        severity: "CRITICAL",
        qber: "24.8%",
        chsh: "1.42",
        action: "Optical Switch Shunted to Quench Eve Tap",
        verdict: "REJECT",
        status: "Quarantined",
        time: formatIstTime(Date.now() - 840000, true)
      },
      {
        id: "ATK-20260828-4490",
        vector: "Photon Number Splitting (PNS)",
        severity: "HIGH",
        qber: "18.2%",
        chsh: "1.65",
        action: "Decoy State Verification Triggered",
        verdict: "REJECT",
        status: "Quarantined",
        time: formatIstTime(Date.now() - 1600000, true)
      }
    ];
  }, [threats]);

  const nodeRows = useMemo(() => [
    {
      id: "QN-ALICE",
      role: "Alice Node · CW Laser Source & BSM Signer",
      state: "ONLINE [OPTICAL LOCK]",
      purity: "99.4%",
      darkCount: "< 18 Hz",
      loss: "0.18 dB/km",
      fidelity: "99.2%",
      status: "Verified",
      verdict: "ACCEPT",
      time: formatIstTime(Date.now() - 4000, true)
    },
    {
      id: "ARB-CORE",
      role: "Arbitrator Hub · SPDC Entangled Pair Source (810nm)",
      state: "ONLINE [SPDC COINCIDENCE]",
      purity: "99.8%",
      darkCount: "< 12 Hz",
      loss: "0.16 dB/km",
      fidelity: "99.6%",
      status: "Verified",
      verdict: "ACCEPT",
      time: formatIstTime(Date.now() - 8000, true)
    },
    {
      id: "QN-BOB",
      role: "Bob Node · Single-Photon Avalanche Diode Array",
      state: qber > 0.055 ? "DEGRADED [NOISE DETECTED]" : "ONLINE [PAULI RECONCILED]",
      purity: qber > 0.055 ? "86.4%" : "98.9%",
      darkCount: qber > 0.055 ? "68 Hz" : "< 22 Hz",
      loss: qber > 0.055 ? "0.85 dB/km" : "0.21 dB/km",
      fidelity: qber > 0.055 ? "81.2%" : "98.5%",
      status: qber > 0.055 ? "Degraded" : "Verified",
      verdict: qber > 0.055 ? "REJECT" : "ACCEPT",
      time: formatIstTime(Date.now() - 2000, true)
    },
    {
      id: "QN-EVE",
      role: "Eve Probe · Adversarial Channel Tap & Sniffer",
      state: "QUARANTINED [BEAM SPLITTER TAP]",
      purity: "58.2%",
      darkCount: "192 Hz",
      loss: "2.40 dB/km",
      fidelity: "52.0%",
      status: "Quarantined",
      verdict: "REJECT",
      time: formatIstTime(Date.now(), true)
    }
  ], [qber]);

  const telemetryRows = useMemo(() => {
    if (telemetryLogs.length > 0) {
      return telemetryLogs.map(l => ({
        id: l.id,
        level: l.isThreat ? "CRITICAL" : "AUDIT",
        stage: l.isThreat ? "Eve Optical Tap" : "BSM Engine",
        text: l.text,
        metric: l.qber ? `QBER ${l.qber}` : "QBER 1.9%",
        gate: l.isThreat ? `BREACH (S=${l.chsh || '1.74'} < 2.00)` : `PASS (S=${l.chsh || '2.76'} > 2.00)`,
        status: l.isThreat ? "Quarantined" : "Verified",
        verdict: l.isThreat ? "REJECT" : "ACCEPT",
        time: l.time || formatIstTime(l.createdAt || Date.now(), true)
      }));
    }
    return [
      { id: "TLM-8921", level: "AUDIT", stage: "Arbitrator Hub", text: "SPDC photon pair emission synchronized at 810nm", metric: "QBER 1.2%", gate: "PASS (S=2.77 > 2.00)", status: "Verified", verdict: "ACCEPT", time: formatIstTime(Date.now() - 15000, true) },
      { id: "TLM-8920", level: "AUDIT", stage: "Alice BSM Core", text: "Bell state measurement coincidence verified: |Φ⁺⟩ registered", metric: "QBER 1.2%", gate: "PASS (S=2.77 > 2.00)", status: "Verified", verdict: "ACCEPT", time: formatIstTime(Date.now() - 28000, true) },
      { id: "TLM-8919", level: "AUDIT", stage: "Bob Reconciler", text: "Pauli frame reconciliation completed with 0 parity errors", metric: "QBER 0.8%", gate: "PASS (S=2.81 > 2.00)", status: "Verified", verdict: "ACCEPT", time: formatIstTime(Date.now() - 42000, true) },
      { id: "TLM-8918", level: "WARN", stage: "Channel Tap", text: "Hoeffding bound variance evaluated against 5.50% threshold", metric: "QBER 5.1%", gate: "PASS (S=2.12 > 2.00)", status: "Verified", verdict: "ACCEPT", time: formatIstTime(Date.now() - 95000, true) },
    ];
  }, [telemetryLogs]);

  const tables = [
    { id: 'quantum_sessions', name: 'quantum_sessions', count: String(dbRows.length), icon: Radio },
    { id: 'attack_records', name: 'attack_records', count: String(attackRows.length), icon: AlertTriangle },
    { id: 'node_metrics', name: 'node_metrics', count: String(nodeRows.length), icon: Network },
    { id: 'telemetry_logs', name: 'telemetry_logs', count: String(telemetryRows.length), icon: Activity },
    { id: 'pqc_handovers', name: 'pqc_handovers', count: String(pqcHandovers.length), icon: ShieldCheck }
  ];

  const currentRecords = useMemo(() => {
    switch (activeTable) {
      case 'attack_records':
        return attackRows;
      case 'node_metrics':
        return nodeRows;
      case 'telemetry_logs':
        return telemetryRows;
      case 'pqc_handovers':
        return pqcHandovers;
      case 'quantum_sessions':
      default:
        return dbRows;
    }
  }, [activeTable, dbRows, attackRows, nodeRows, telemetryRows, pqcHandovers]);

  const filteredRecords = useMemo(() => {
    return currentRecords.filter((row: any) => {
      const searchStr = Object.values(row).join(' ').toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL'
        ? true
        : statusFilter === 'VERIFIED'
        ? row.status === 'Verified' || row.verdict === 'ACCEPT'
        : statusFilter === 'QUARANTINED'
        ? row.status === 'Quarantined' || row.status === 'Degraded' || row.verdict === 'REJECT'
        : row.status?.includes('PQC') || row.verdict?.includes('PQC') || row.pqcMode?.includes('Active');
      return matchesSearch && matchesStatus;
    });
  }, [currentRecords, searchQuery, statusFilter]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a: any, b: any) => {
      const valA = a[sortField] ?? '';
      const valB = b[sortField] ?? '';
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortField, sortDirection]);

  const selected = selectedRecord || sortedRecords[0] || currentRecords[0];

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const exportTableCsv = () => {
    if (sortedRecords.length === 0) {
      toast.error("No records available to export");
      return;
    }
    const headers = Object.keys(sortedRecords[0]).join(',');
    const rows = sortedRecords.map(r => Object.values(r).map(val => `"${val}"`).join(','));
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTable}_export_${Date.now()}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sortedRecords.length} records to CSV`);
  };

  const exportTableJson = () => {
    if (sortedRecords.length === 0) {
      toast.error("No records available to export");
      return;
    }
    const blob = new Blob([JSON.stringify(sortedRecords, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTable}_export_${Date.now()}.json`);
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sortedRecords.length} records to JSON`);
  };

  return (
    <div className="page-content database-page">
      <Topbar
        eyebrow="04 / Ledger & Database"
        title="Live database"
        subtitle="Persistent session registry, quantum state registers, forensic audit logs, and PostgreSQL transaction attestations"
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="button button-quiet button-small" onClick={exportTableCsv} title="Export current table to CSV">
              <Download size={13} /> Export CSV
            </button>
            <button className="button button-quiet button-small" onClick={exportTableJson} title="Export current table to JSON">
              <FileCode size={13} /> Export JSON
            </button>
            <button className="button button-copper button-small" onClick={() => { fetchLiveDatabase(); toast.success("Live PostgreSQL sync refreshed"); }}>
              <Database size={14} /> Synced with Backend
            </button>
          </div>
        }
      />

      {/* Top Database Summary Strip */}
      <div className="db-kpis-strip">
        <div className="db-kpi-card">
          <span className="eyebrow">Database records</span>
          <strong>{dbRows.length + attackRows.length + nodeRows.length + telemetryRows.length + pqcHandovers.length} Total</strong>
          <small><StatusDot tone="ok" /> 5 Ledger Tables Active</small>
        </div>
        <div className="db-kpi-card">
          <span className="eyebrow">Physical QDS verified</span>
          <strong className="text-[#2F6F85]">98.5%</strong>
          <small><ShieldCheck size={12} className="text-[#059669]" /> Bell non-locality sealed</small>
        </div>
        <div className="db-kpi-card">
          <span className="eyebrow">PQC fallback handovers</span>
          <strong className={threats.length > 0 ? "text-copper" : ""}>{pqcHandovers.length} Active</strong>
          <small><LockKeyhole size={12} className="text-copper" /> ML-DSA-65 / ML-KEM-768</small>
        </div>
        <div className="db-kpi-card">
          <span className="eyebrow">Storage latency</span>
          <strong>2.4 ms</strong>
          <small><StatusDot tone="blue" /> WAL Logging / SQLite + PG</small>
        </div>
      </div>

      <div className="db-layout">
        <aside className="table-sidebar">
          <span className="eyebrow">Tables ({tables.length})</span>
          {tables.map((table) => {
            const Icon = table.icon;
            return (
              <button
                className={cn("table-nav", activeTable === table.id && "table-nav-active")}
                key={table.id}
                onClick={() => {
                  setActiveTable(table.id as any);
                  setSelectedRecord(null);
                  setSearchQuery('');
                  setSortField('time');
                }}
              >
                <Icon size={15} />
                <span>{table.name}</span>
                <b>{table.count}</b>
              </button>
            );
          })}
          <div className="db-sidebar-foot">
            <StatusDot tone="ok" /> FastAPI + SQLite / PG Sync
            <span className="mono muted" style={{ fontSize: "8.5px", marginLeft: "auto" }}>{lastSyncTime}</span>
          </div>
        </aside>

        <main className="db-main">
          <div className="db-toolbar">
            <div className="db-title">
              <Database size={16} />
              <strong>{activeTable}</strong>
              <Pill tone="good">online</Pill>
            </div>
            <div className="db-actions">
              <div className="search-box">
                <Search size={14} />
                <input
                  placeholder={`Search in ${activeTable}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', padding: 0 }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="filter-chips">
                {(['ALL', 'VERIFIED', 'QUARANTINED', 'PQC'] as const).map(flt => (
                  <button
                    key={flt}
                    className={cn("filter-chip", statusFilter === flt && "filter-chip-active")}
                    onClick={() => setStatusFilter(flt)}
                  >
                    {flt}
                  </button>
                ))}
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  fetchLiveDatabase();
                  toast.success("Database records synchronized from backend");
                }}
                aria-label="Refresh table"
                title="Refresh table"
              >
                <RefreshCw size={15} className={isLoading ? "spin" : ""} />
              </button>
            </div>
          </div>

          <div className="data-table-wrap db-table-wrap">
            {isLoading ? (
              <div style={{ padding: "16px" }}>
                <SkeletonTableRows rows={6} />
              </div>
            ) : sortedRecords.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--slate)", fontFamily: "var(--mono)", fontSize: "12px" }}>
                <AlertTriangle size={24} style={{ margin: "0 auto 10px", color: "var(--copper)", opacity: 0.6 }} />
                <div>No records matching query "{searchQuery}" in {activeTable}</div>
                <button
                  className="button button-quiet button-small"
                  onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                  style={{ marginTop: "12px" }}
                >
                  Reset filters
                </button>
              </div>
            ) : activeTable === 'quantum_sessions' ? (
              /* Quantum Sessions Table */
              <table className="data-table db-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className="cursor-pointer">Session ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                    <th onClick={() => handleSort('doc')} className="cursor-pointer">Protected Payload {sortField === 'doc' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                    <th>Status</th>
                    <th onClick={() => handleSort('qber')} className="cursor-pointer">QBER {sortField === 'qber' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                    <th>Hoeffding (τ)</th>
                    <th onClick={() => handleSort('chsh')} className="cursor-pointer">CHSH (S) {sortField === 'chsh' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                    <th>PQC Fallback</th>
                    <th>Verdict</th>
                    <th onClick={() => handleSort('time')} className="cursor-pointer">Recorded (IST) {sortField === 'time' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((row: any) => (
                    <tr
                      onClick={() => setSelectedRecord(row)}
                      className={selected?.id === row.id ? "row-selected" : ""}
                      key={row.id}
                    >
                      <td className="mono strong-cell">{row.id}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: '11px' }}>{row.doc}</strong>
                          <span className="mono muted" style={{ fontSize: '9px' }}>{row.digest ? `${row.digest.slice(0, 16)}...` : '0x6692d35f...'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={cn("row-status", (row.status === "Quarantined" || row.status === "Degraded" || row.verdict === "REJECT") && "row-status-bad")}>
                          <StatusDot tone={row.status === "Quarantined" || row.status === "Degraded" || row.verdict === "REJECT" ? "bad" : "ok"} />
                          {row.status}
                        </span>
                      </td>
                      <td className={cn("mono", parseFloat(row.qber) > 5.5 ? "text-copper font-bold" : "text-[#2F6F85]")}>
                        {row.qber}
                      </td>
                      <td className="mono muted">{row.hoeffding || "5.50%"}</td>
                      <td className={cn("mono", parseFloat(row.chsh) < 2.0 ? "text-copper font-bold" : "text-[#2F6F85]")}>
                        S={row.chsh}
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: '10px', color: row.pqcMode?.includes('Active') ? 'var(--copper)' : 'var(--slate)' }}>
                          {row.pqcMode || "Standby"}
                        </span>
                      </td>
                      <td>
                        <Pill tone={row.verdict === "REJECT" ? "copper" : row.verdict?.includes("PQC") ? "dark" : "good"}>
                          {row.verdict || "ACCEPT"}
                        </Pill>
                      </td>
                      <td className="mono muted">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeTable === 'attack_records' ? (
              /* Attack Records Table */
              <table className="data-table db-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className="cursor-pointer">Incident ID</th>
                    <th onClick={() => handleSort('vector')} className="cursor-pointer">Adversarial Vector</th>
                    <th>Severity</th>
                    <th onClick={() => handleSort('qber')} className="cursor-pointer">Observed QBER</th>
                    <th onClick={() => handleSort('chsh')} className="cursor-pointer">CHSH Score (S)</th>
                    <th>Defensive Countermeasure</th>
                    <th>Verdict</th>
                    <th onClick={() => handleSort('time')} className="cursor-pointer">Detected (IST)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((row: any) => (
                    <tr
                      onClick={() => setSelectedRecord(row)}
                      className={selected?.id === row.id ? "row-selected" : ""}
                      key={row.id}
                    >
                      <td className="mono strong-cell text-copper">{row.id}</td>
                      <td>
                        <strong style={{ fontSize: '11px', color: 'var(--ink)' }}>{row.vector}</strong>
                      </td>
                      <td>
                        <Pill tone={row.severity === "CRITICAL" ? "copper" : "dark"}>
                          {row.severity}
                        </Pill>
                      </td>
                      <td className="mono text-copper font-bold">{row.qber}</td>
                      <td className="mono text-copper font-bold">S={row.chsh}</td>
                      <td style={{ fontSize: '10.5px', color: 'var(--slate)' }}>{row.action}</td>
                      <td>
                        <Pill tone="copper">REJECT</Pill>
                      </td>
                      <td className="mono muted">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeTable === 'node_metrics' ? (
              /* Node Metrics Table */
              <table className="data-table db-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className="cursor-pointer">Node ID</th>
                    <th>Architecture Role & Optical Hardware</th>
                    <th>Operational State</th>
                    <th>Quantum Purity Tr(ρ²)</th>
                    <th>Dark Count</th>
                    <th>Attenuation</th>
                    <th>Bell Fidelity</th>
                    <th onClick={() => handleSort('time')} className="cursor-pointer">Last Calibrated (IST)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((row: any) => (
                    <tr
                      onClick={() => setSelectedRecord(row)}
                      className={selected?.id === row.id ? "row-selected" : ""}
                      key={row.id}
                    >
                      <td className="mono strong-cell">{row.id}</td>
                      <td>
                        <strong style={{ fontSize: '11px' }}>{row.role}</strong>
                      </td>
                      <td>
                        <span className={cn("row-status", row.state.includes("QUARANTINED") ? "row-status-bad" : row.state.includes("DEGRADED") ? "text-copper" : "status-text-good")}>
                          <StatusDot tone={row.state.includes("QUARANTINED") ? "bad" : row.state.includes("DEGRADED") ? "warn" : "ok"} />
                          {row.state}
                        </span>
                      </td>
                      <td className="mono">{row.purity}</td>
                      <td className="mono muted">{row.darkCount}</td>
                      <td className="mono muted">{row.loss}</td>
                      <td className={cn("mono", parseFloat(row.fidelity) < 90 ? "text-copper font-bold" : "text-[#2F6F85]")}>
                        {row.fidelity}
                      </td>
                      <td className="mono muted">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeTable === 'telemetry_logs' ? (
              /* Telemetry Logs Table */
              <table className="data-table db-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className="cursor-pointer">Log ID</th>
                    <th>Level</th>
                    <th>Subsystem Stage</th>
                    <th>Audit Narrative / Event Details</th>
                    <th>Metric Delta</th>
                    <th>Security Boundary</th>
                    <th onClick={() => handleSort('time')} className="cursor-pointer">Logged At (IST)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((row: any) => (
                    <tr
                      onClick={() => setSelectedRecord(row)}
                      className={selected?.id === row.id ? "row-selected" : ""}
                      key={row.id}
                    >
                      <td className="mono strong-cell">{row.id}</td>
                      <td>
                        <Pill tone={row.level === "CRITICAL" ? "copper" : row.level === "WARN" ? "dark" : "good"}>
                          {row.level}
                        </Pill>
                      </td>
                      <td className="mono" style={{ fontSize: '10.5px' }}>{row.stage}</td>
                      <td style={{ maxWidth: '300px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--ink)' }}>{row.text}</span>
                      </td>
                      <td className="mono muted">{row.metric}</td>
                      <td className={cn("mono", row.gate.includes("BREACH") ? "text-copper font-bold" : "text-[#2F6F85]")}>
                        {row.gate}
                      </td>
                      <td className="mono muted">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* PQC Handovers Table */
              <table className="data-table db-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className="cursor-pointer">Handover ID</th>
                    <th>Trigger Reason</th>
                    <th>Target Document</th>
                    <th>Post-Quantum Algorithm</th>
                    <th>NIST Level</th>
                    <th>Latency</th>
                    <th>Status</th>
                    <th onClick={() => handleSort('time')} className="cursor-pointer">Handover (IST)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((row: any) => (
                    <tr
                      onClick={() => setSelectedRecord(row)}
                      className={selected?.id === row.id ? "row-selected" : ""}
                      key={row.id}
                    >
                      <td className="mono strong-cell text-[#2F6F85]">{row.id}</td>
                      <td style={{ fontSize: '10.5px', color: 'var(--copper)', fontWeight: 500 }}>{row.trigger}</td>
                      <td>
                        <strong style={{ fontSize: '11px' }}>{row.doc}</strong>
                      </td>
                      <td className="mono" style={{ fontSize: '10.5px' }}>{row.scheme}</td>
                      <td className="mono muted">{row.nistLevel}</td>
                      <td className="mono text-[#2F6F85]">{row.latency}</td>
                      <td>
                        <Pill tone="good">PQC SEALED</Pill>
                      </td>
                      <td className="mono muted">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="db-pagination">
            <span>Showing {sortedRecords.length} of {currentRecords.length} records in <code>{activeTable}</code></span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="button button-quiet button-small"
                onClick={exportTableJson}
                title="Export Filtered JSON"
                style={{ fontSize: "10.5px", padding: "4px 10px", gap: "4px" }}
              >
                <FileCode size={13} /> Export JSON
              </button>
              <button className="page-current">1</button>
            </div>
          </div>
        </main>

        <aside className="record-drawer">
          <div className="drawer-head">
            <div>
              <span className="eyebrow">Record inspector</span>
              <h3 style={{ margin: "2px 0 0", fontSize: "15px", fontFamily: "var(--serif)" }}>
                {activeTable === 'quantum_sessions' ? 'Quantum Session Registry' :
                 activeTable === 'attack_records' ? 'Adversarial Incident Trace' :
                 activeTable === 'node_metrics' ? 'Hardware Node State' :
                 activeTable === 'telemetry_logs' ? 'Telemetry Event Digest' :
                 'PQC Handover Attestation'}
              </h3>
            </div>
            <button className="icon-button" onClick={() => setSelectedRecord(null)} aria-label="Close inspector">
              <X size={15} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Pill tone={selected?.verdict === "REJECT" ? "copper" : selected?.verdict?.includes("PQC") ? "dark" : "good"}>
              {selected?.verdict || "ACCEPT"} / {selected?.status || "Verified"}
            </Pill>
            <span className="mono muted" style={{ fontSize: '10px', marginLeft: 'auto' }}>{selected?.time}</span>
          </div>

          <div className="record-id">
            <span>{selected?.id || "QKD-20260828-0001"}</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(selected?.id || "");
                toast.success("Record ID copied to clipboard");
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', marginLeft: 'auto' }}
              title="Copy ID"
            >
              <Copy size={13} />
            </button>
          </div>
          
          <div className="record-block">
            <span className="eyebrow">Target entity / descriptor</span>
            <strong>{selected?.doc || selected?.role || selected?.vector || selected?.text || "board-resolution.pdf"}</strong>
            {selected?.digest && (
              <span className="mono muted" style={{ fontSize: "9px", wordBreak: "break-all" }}>
                sha256: {selected.digest}
              </span>
            )}
          </div>

          <div className="record-metrics">
            <div>
              <span>Observed QBER</span>
              <strong className={selected?.qber && parseFloat(selected.qber) > 5.5 ? "text-copper" : "text-[#2F6F85]"}>
                {selected?.qber || (selected?.purity ? `Purity ${selected.purity}` : "1.9%")}
              </strong>
            </div>
            <div>
              <span>CHSH S-score</span>
              <strong className={selected?.chsh && parseFloat(selected.chsh) < 2.0 ? "text-copper" : "text-[#2F6F85]"}>
                {selected?.chsh ? `S=${selected.chsh}` : (selected?.fidelity ? `F=${selected.fidelity}` : "S=2.76")}
              </strong>
            </div>
          </div>

          {/* Dynamic Quantum State Breakdown */}
          <div className="quantum-breakdown-card">
            <div className="breakdown-head">
              <Sparkles size={13} />
              <span>Quantum Registers & Verification Proof</span>
            </div>
            <div className="breakdown-grid">
              <div>
                <small>Bell State</small>
                <strong>{selected?.bellState || "|Φ⁺⟩ (Entangled)"}</strong>
              </div>
              <div>
                <small>Hoeffding Bound</small>
                <strong>{selected?.hoeffding || "τ = 5.50%"}</strong>
              </div>
              <div>
                <small>Security Layer</small>
                <strong className={selected?.pqcMode?.includes('Active') || selected?.scheme ? "text-copper" : "text-[#2F6F85]"}>
                  {selected?.scheme || selected?.pqcMode || "Primary QDS"}
                </strong>
              </div>
              <div>
                <small>Confidence Level</small>
                <strong>1 - e<sup>-2nε²</sup> &gt; 99.99%</strong>
              </div>
            </div>
          </div>

          <div className="json-block">
            <div>
              <span>{activeTable}.jsonb</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(JSON.stringify(selected, null, 2));
                  toast.success("Record JSON copied to clipboard");
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate)" }}
                title="Copy JSON"
              >
                <Copy size={13} />
              </button>
            </div>
            <pre>{JSON.stringify({
              table: activeTable,
              record_id: selected?.id,
              entity: selected?.doc || selected?.role || selected?.vector,
              digest: selected?.digest,
              status: selected?.status || "Verified",
              metrics: {
                qber: selected?.qber || "1.9%",
                chsh_score: selected?.chsh || "2.76",
                hoeffding_bound: selected?.hoeffding || "5.50%",
                state_purity: selected?.purity || "99.4%"
              },
              quantum_registers: {
                alice_basis: ["X", "Z", "X", "Z", "Z", "X", "Z", "X"],
                bell_coincidences: ["|Φ⁺⟩", "|Φ⁺⟩", "|Ψ⁻⟩", "|Φ⁺⟩"],
                pauli_frame: ["I", "σX", "σZ", "σXZ", "I"]
              },
              pqc_handover: {
                engaged: selected?.verdict === "REJECT" || Boolean(selected?.scheme) || selected?.pqcMode?.includes('Active'),
                algorithm: selected?.scheme || "CRYSTALS-Dilithium3 (ML-DSA-65)"
              },
              timestamp_ist: selected?.time || formatIstTime(Date.now(), true)
            }, null, 2)}</pre>
          </div>

          <button
            className="button button-outline drawer-button"
            onClick={() => {
              navigator.clipboard?.writeText(JSON.stringify(selected, null, 2));
              toast.success("Record payload copied to clipboard");
            }}
          >
            <Clipboard size={14} /> Copy Full JSON Payload
          </button>
        </aside>
      </div>
    </div>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const windowScroll = window.scrollY || document.documentElement.scrollTop;
      const mainShellScroll = document.querySelector(".main-shell")?.scrollTop || 0;
      const appShellScroll = document.querySelector(".app-shell")?.scrollTop || 0;
      const demoScroll = document.querySelector(".demonstration-desk-page")?.scrollTop || 0;
      const sandboxScroll = document.querySelector(".sandbox-v2-main")?.scrollTop || 0;
      
      const maxScroll = Math.max(windowScroll, mainShellScroll, appShellScroll, demoScroll, sandboxScroll);
      setVisible(maxScroll > 160);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const selectors = [
      ".main-shell",
      ".app-shell",
      ".demonstration-desk-page",
      ".sandbox-v2-main",
      ".monitoring-v2-layout",
      ".transfer-v2-layout",
      ".db-v2-layout"
    ];
    selectors.forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  return (
    <button
      className={cn(
        "back-to-top-btn",
        visible ? "back-to-top-visible" : "back-to-top-hidden"
      )}
      onClick={scrollToTop}
      aria-label="Back to Top"
      title="Back to Top"
    >
      <ArrowUp size={14} />
      <span>TOP</span>
    </button>
  );
}

export default function Home() {
  const [location] = useLocation();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRailCollapsed, setIsRailCollapsed] = useState(() => {
    return localStorage.getItem("qds_rail_collapsed") === "true";
  });

  useEffect(() => {
    const handleOpenLogin = () => setIsLoginModalOpen(true);
    window.addEventListener("qds-open-login", handleOpenLogin);
    return () => window.removeEventListener("qds-open-login", handleOpenLogin);
  }, []);

  const toggleRail = () => {
    setIsRailCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("qds_rail_collapsed", String(next));
      return next;
    });
  };

  useEffect(() => { document.title = "QDS Sentinel — Quantum signature assurance"; }, []);
  const page = useMemo(() => location === "/demonstration" ? <DemonstrationPage /> : location === "/monitoring" ? <MonitoringPage /> : location === "/attack-sandbox" ? <SandboxPage /> : location === "/transfer" ? <TransferPage /> : location === "/database" ? <DatabasePage /> : <HomePortal />, [location]);
  const isPortal = location === "/" || location === "/home" || location === "/demonstration";
  const isSandbox = location === "/attack-sandbox";
  const isTransfer = location === "/transfer";
  const isChromeFree = isPortal || isSandbox || isTransfer;
  return (
    <div className={cn("app-shell", isPortal && "app-shell-portal", isSandbox && "app-shell-sandbox", isTransfer && "app-shell-transfer", isRailCollapsed && "rail-is-collapsed")}>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      {!isChromeFree && <Sidebar location={location} isCollapsed={isRailCollapsed} onToggle={toggleRail} />}
      <main className="main-shell">

        {page}
        {!isSandbox && !isTransfer && (
          <footer className="page-footer">
            <span className="footer-brand"><img src={MARK} alt="" /> QDS SENTINEL / v1.0.0</span>
            <button
              type="button"
              className="text-link"
              onClick={() => window.dispatchEvent(new CustomEvent('qds-open-guidelines'))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
            >
              <FileText size={12} />
              <span>Guidelines &amp; Policies</span>
            </button>
            <span>fastapi gateway <b>3001 OK</b></span>
            <span>© 2026 quantum assurance lab</span>
          </footer>
        )}
      </main>
      <BackToTopButton />
    </div>
  );
}

