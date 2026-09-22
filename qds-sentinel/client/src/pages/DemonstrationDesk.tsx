/* Signal Atelier Demonstration Desk: a rail-free, copper-and-blue quantum instrument panel with compact operational hierarchy. */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, ArrowLeft, Bell, Check, ChevronRight, Download, FileKey2, Pause, Play, Plus, RotateCcw, Settings2, ShieldCheck, Sparkles, X, Zap, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useSentinel } from "@/lib/SentinelContext";
import { useAuth } from "@/contexts/AuthContext";

type NodeId = "alice" | "arb" | "bob" | "eve";
type Point = { x: number; y: number };

const phases = [
  { short: "EPR prep", label: "Entangled photon pair emission", meta: "Pump BBO crystal · λ 775nm", icon: Sparkles },
  { short: "Distribution", label: "Photon distribution", meta: "Entangled pair · channel A / B", icon: ArrowLeft },
  { short: "Measurement", label: "Joint Bell state measurement", meta: "Alice BSM · shared outcome", icon: FileKey2 },
  { short: "Sifting", label: "Classical feed-forward", meta: "Basis reconciliation · Pauli frame", icon: ChevronRight },
  { short: "Error est.", label: "Hoeffding statistical bound audit", meta: "QBER sampling · threshold gate", icon: AlertTriangle },
  { short: "Key gen", label: "Privacy amplification & verdict", meta: "Toeplitz hash · signature sealed", icon: ShieldCheck },
];

const matrixRows = Array.from({ length: 8 }, (_, index) => ({
  pulse: String(index + 1).padStart(2, "0"),
  aliceBasis: index % 3 === 0 ? "×" : "+",
  aliceBit: index % 2 ? "1" : "0",
  bobBasis: index % 3 === 1 ? "+" : "×",
  bobBit: index % 2 ? "1" : "0",
  bell: ["Φ−", "Φ+", "Ψ+", "Φ+", "Φ−", "Ψ−", "Φ+", "Ψ+"][index],
  discarded: index === 3 || index === 4 || index === 7,
}));

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function DeskModal({ title, eyebrow, children, onClose }: { title: string; eyebrow: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return <div className="modal-backdrop" onClick={onClose}><section className="modal-card demo-desk-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}><header className="modal-head"><div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3></div><button className="icon-button" aria-label={`Close ${title}`} onClick={onClose}><X size={15} /></button></header>{children}</section></div>;
}

export function DemonstrationDesk() {
  const { toggleNotificationCenter, unreadNotificationCount } = useSentinel();
  const { user, logout } = useAuth();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [eve, setEve] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [executingLive, setExecutingLive] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [streamPulse, setStreamPulse] = useState(1);
  const [activePulse, setActivePulse] = useState(0);
  const [dragging, setDragging] = useState<NodeId | null>(null);
  const [nodes, setNodes] = useState<Record<NodeId, Point>>({
    alice: { x: 18, y: 38 },
    arb: { x: 48, y: 18 },
    bob: { x: 78, y: 38 },
    eve: { x: 48, y: 68 },
  });

  const stageRef = useRef<HTMLDivElement>(null);
  const phase = phases[step];
  const qber = eve ? "14.2%" : "1.9%";
  const chsh = eve ? "1.76" : "2.76";

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      setStep((current) => (current >= phases.length - 1 ? 0 : current + 1));
      setStreamPulse((current) => (current >= 8 ? 1 : current + 1));
      setActivePulse((current) => (current >= 7 ? 0 : current + 1));
    }, Math.max(700, Math.round(2400 / speed)));
    return () => window.clearInterval(interval);
  }, [playing, speed]);

  const beginDrag = (id: NodeId, event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(id);
  };

  const updateDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = clamp(Math.round(((event.clientX - rect.left) / rect.width) * 100), 8, 92);
    const y = clamp(Math.round(((event.clientY - rect.top) / rect.height) * 100), 12, 88);
    setNodes((current) => ({ ...current, [dragging]: { x, y } }));
  };

  const endDrag = () => setDragging(null);
  const resetLayout = () => setNodes({ alice: { x: 18, y: 38 }, arb: { x: 48, y: 18 }, bob: { x: 78, y: 38 }, eve: { x: 48, y: 68 } });

  const exportMatrix = () => {
    const rows = ["Pulse,Alice basis,Alice bit,Bob basis,Bob bit,Bell state,Eve intercept,Sift status", ...matrixRows.map((row) => [row.pulse, row.aliceBasis, row.aliceBit, row.bobBasis, row.bobBit, row.bell, eve ? "Active" : "Bypassed", row.discarded ? "Discarded" : "Kept"].join(","))].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qds_matrix_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Quantum matrix CSV downloaded");
  };

  const phaseLabel = `Phase ${String(step + 1).padStart(2, "0")} of 06 · ${phase.short}`;
  const dataLine = (from: Point, to: Point) => ({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
  const links = eve ? [dataLine(nodes.arb, nodes.alice), dataLine(nodes.arb, nodes.eve), dataLine(nodes.eve, nodes.bob)] : [dataLine(nodes.arb, nodes.alice), dataLine(nodes.arb, nodes.bob), dataLine(nodes.alice, nodes.bob)];

  return <main className="page-content demo-desk">
    <header className="demo-desk-header">
      <Link href="/home" className="demo-desk-brand" aria-label="QDS Sentinel home"><span className="demo-desk-mark"><ShieldCheck size={15} /></span><strong>QDS SENTINEL</strong><span>signal atelier / protocol desk</span></Link>
      <div className="demo-desk-route"><span>01 / quantum protocol</span><strong>Demonstration</strong></div>
      <div className="demo-desk-header-actions">
        <button className="button button-copper button-small" onClick={() => setShowNewSession(true)}><Plus size={14} /> New session</button>
        <button className="icon-button" onClick={() => setShowSettings(true)} aria-label="Simulation settings"><Settings2 size={15} /></button>
        <button
          className="icon-button"
          onClick={toggleNotificationCenter}
          aria-label="Notifications"
          style={{ position: 'relative' }}
          title={unreadNotificationCount > 0 ? `${unreadNotificationCount} unread signal notifications` : "Notification Center"}
        >
          <Bell size={15} />
          {unreadNotificationCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                minWidth: '14px',
                height: '14px',
                padding: '0 3px',
                borderRadius: '999px',
                background: 'var(--copper)',
                color: '#fff',
                fontSize: '8px',
                fontWeight: 'bold',
                fontFamily: 'var(--mono)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </button>
        <Link href="/home" className="demo-desk-home"><ArrowLeft size={13} /> Home</Link>
        {user && (
          <button
            className="icon-button"
            onClick={() => {
              logout();
              toast.info("Signed out of Demonstration Desk.");
              window.location.href = "#/login";
            }}
            title={`Signed in as ${user.display_name} (${user.role}). Click to Sign Out.`}
            aria-label="Sign out"
            style={{ color: 'var(--slate)', marginLeft: '4px' }}
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </header>

    <section className="demo-desk-command-strip" aria-label="Simulator controls and protocol phases">
      <aside className="demo-desk-simulator"><div className="demo-desk-kicker"><span>Simulator control</span><b>T+0.045s</b></div><div className="demo-desk-play-controls"><button onClick={() => setPlaying((current) => !current)} aria-label={playing ? "Pause simulator" : "Play simulator"}>{playing ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}<span>{playing ? "Pause" : "Play"}</span></button><button onClick={() => setStep((current) => current >= phases.length - 1 ? 0 : current + 1)} aria-label="Step protocol forward"><ChevronRight size={15} /></button><button onClick={() => { setStep(0); setPlaying(false); setEve(false); }} aria-label="Reset protocol"><RotateCcw size={14} /></button></div><button className="demo-desk-live-run" disabled={executingLive} onClick={() => { setExecutingLive(true); window.setTimeout(() => { setExecutingLive(false); setStep(5); setPlaying(false); toast.success("Live signature verification completed"); }, 700); }}><Zap size={14} /> {executingLive ? "Executing…" : "Execute live run"}</button><button className="demo-desk-configure" onClick={() => setShowSettings(true)}><Settings2 size={13} /> Configure session</button></aside>
      <section className="demo-desk-phase-lane"><div className="demo-desk-phase-head"><span>Protocol phase</span><b>{phaseLabel}</b></div><div className="demo-desk-phase-track">{phases.map((item, index) => { const Icon = item.icon; return <button key={item.short} className={index === step ? "demo-desk-phase-active" : index < step ? "demo-desk-phase-done" : ""} onClick={() => setStep(index)}><span><Icon size={17} /></span><strong>{item.short}</strong><small>{index < step ? "sealed" : index === step ? "active" : `0${index + 1}`}</small></button>; })}</div></section>
    </section>

    <section className="demo-desk-channel">
      <header className="demo-desk-channel-head"><div><span>Optical channel topology</span><b>Draggable nodes</b><button onClick={resetLayout}><RotateCcw size={13} /> Reset layout</button></div><label className={eve ? "demo-desk-eve demo-desk-eve-active" : "demo-desk-eve"}><span>Eve interception</span><button onClick={() => { setEve((current) => !current); toast[eve ? "info" : "error"](eve ? "Eve bypassed · channel restored" : "Threat injection enabled"); }} aria-pressed={eve}><i /></button><small>{eve ? "35% active" : "bypassed"}</small></label></header>
      <div className="demo-desk-status-line"><span className={playing ? "demo-desk-running" : ""}>{playing ? "Simulation running" : "Simulation paused"}</span><i /><b>{phaseLabel}</b><span>Stream pulse: <strong>#{streamPulse} / 08</strong></span><span>Measured QBER: <strong className={eve ? "text-copper" : "text-blue"}>{qber} {eve ? "(alert)" : "(nominal)"}</strong></span></div>
      <div ref={stageRef} className={eve ? "demo-desk-canvas demo-desk-canvas-threat" : "demo-desk-canvas"} onPointerMove={updateDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <svg className="demo-desk-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {links.map((link, index) => (
            <line key={index} className={eve && index > 0 ? "demo-desk-link demo-desk-link-threat" : "demo-desk-link"} {...link} />
          ))}
          {[nodes.alice, nodes.arb, nodes.bob].map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r=".72" />
          ))}
        </svg>

        {!eve && <div className="demo-desk-photon demo-desk-photon-a" style={{ left: `${nodes.arb.x}%`, top: `${nodes.arb.y}%` }} />}
        {!eve && <div className="demo-desk-photon demo-desk-photon-b" style={{ left: `${nodes.arb.x}%`, top: `${nodes.arb.y}%` }} />}
        {eve && <div className="demo-desk-photon demo-desk-photon-eve" style={{ left: `${nodes.eve.x}%`, top: `${nodes.eve.y}%` }} />}

        {(["alice", "arb", "bob", "eve"] as NodeId[]).map((id) => {
          const point = nodes[id];
          const specs = {
            alice: { name: "Alice node", role: "TX MOD 99", detail: "Awaiting photon A", icon: FileKey2, tone: "blue" },
            arb: { name: "Arbitrator", role: "EPR source", detail: phase.meta, icon: Sparkles, tone: "copper" },
            bob: { name: "Bob node", role: "RX DET 01", detail: "Awaiting photon B", icon: ShieldCheck, tone: "blue" },
            eve: { name: "Eve probe", role: eve ? "Interception active" : "Bypassed / passive", detail: eve ? "Tap rate 35%" : "No channel access", icon: AlertTriangle, tone: "copper" }
          }[id];
          const Icon = specs.icon;

          return (
            <button
              key={id}
              className={`demo-desk-node demo-desk-node-${specs.tone} ${id === "eve" && !eve ? "demo-desk-node-muted" : ""} ${dragging === id ? "demo-desk-node-dragging" : ""}`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              onPointerDown={(event) => beginDrag(id, event)}
            >
              <span className="demo-desk-node-icon"><Icon size={26} /></span>
              <strong>{specs.name}</strong>
              <small>{specs.role}</small>
              <em>{specs.detail}</em>
            </button>
          );
        })}
      </div>
    </section>

    <section className="demo-desk-matrix"><header><div><span>Quantum bitstream & Pauli alignment matrix</span><b>Pulse #{streamPulse}</b></div><button onClick={exportMatrix}><Download size={14} /> Export CSV</button></header><div className="demo-desk-table-wrap"><table><thead><tr><th>PLS</th><th>Alice basis</th><th>Alice bit</th><th>Bob basis</th><th>Bob bit</th><th>Bell state</th><th>Eve int.</th><th>Sift status</th></tr></thead><tbody>{matrixRows.map((row, index) => <tr key={row.pulse} className={index === activePulse ? "demo-desk-matrix-active" : ""}><td>{row.pulse}</td><td>{row.aliceBasis}</td><td>{row.aliceBit}</td><td>{row.bobBasis}</td><td>{row.bobBit}</td><td>{row.bell}</td><td>{eve ? (index % 3 === 0 ? "tap" : "—") : "—"}</td><td className={row.discarded ? "demo-desk-discarded" : "demo-desk-kept"}>{row.discarded ? "Discarded" : "Kept"}</td></tr>)}</tbody></table></div></section>

    {showNewSession && <DeskModal eyebrow="Provision / 01" title="New quantum session" onClose={() => setShowNewSession(false)}><p className="modal-copy">Provision a clean authenticated channel at the EPR preparation phase.</p><div className="demo-desk-form"><label>Document<input defaultValue="board-resolution.pdf" /></label><label>Protocol profile<select defaultValue="QDS / 1550nm"><option>QDS / 1550nm</option><option>QDS / test channel</option></select></label></div><button className="button button-copper modal-submit" onClick={() => { setShowNewSession(false); setStep(0); setPlaying(true); toast.success("Quantum session created and active"); }}><Play size={14} fill="currentColor" /> Create & start session</button></DeskModal>}
    {showSettings && <DeskModal eyebrow="Control plane" title="Simulation settings" onClose={() => setShowSettings(false)}><div className="demo-desk-settings"><span>Playback speed</span><div>{[0.5, 1, 2, 4].map((s) => <button className={s === speed ? "demo-desk-speed-active" : ""} key={s} onClick={() => setSpeed(s)}>{s}×</button>)}</div></div><p className="modal-copy">Photon flow and phase progression remain synchronized at every speed.</p></DeskModal>}
  </main>;
}

export default DemonstrationDesk;
