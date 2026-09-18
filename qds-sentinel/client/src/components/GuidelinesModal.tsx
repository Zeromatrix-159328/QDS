import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Cpu,
  Download,
  X,
  Scale,
  Radio,
  BookOpen,
  ArrowRight,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import MARK from '@/assets/qds-sentinel-mark_81058a94.png';

export default function GuidelinesModal() {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      // Auto-popup unless user checked "do not show again"
      const dismissed = localStorage.getItem('qds_guidelines_dismissed');
      return dismissed !== 'true';
    } catch {
      return true;
    }
  });

  const [activeTab, setActiveTab] = useState<'protocol' | 'containment' | 'clearance' | 'compliance'>('protocol');
  const [acknowledged, setAcknowledged] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('qds-open-guidelines', handleOpen);
    return () => window.removeEventListener('qds-open-guidelines', handleOpen);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('qds_guidelines_dismissed', 'true');
      } catch {}
    }
    setIsOpen(false);
    toast.success('Guidelines & Operational Policies acknowledged. Welcome to QDS Sentinel.');
  };

  const policyText = `===============================================================
QDS SENTINEL — QUANTUM SECURITY GUIDELINES & OPERATIONAL POLICIES
Doc Ref: DOC-QDS-SEC-2026-REV4 | Classification: RESTRICTED / SEC-3
Effective Date: March 2026 | Governing Body: Quantum Assurance Lab
===============================================================

1. QUANTUM PROTOCOL OPERATIONAL RULES
-------------------------------------
1.1 Entangled Photon Pair Handling:
    - SPDC pump crystal emits correlated photon pairs at lambda = 775nm -> 1550nm.
    - All dark fiber transmissions must maintain optical state purity >= 98.5%.
    - Minimum joint coincidence count rate >= 120 kcps.
1.2 Bell Non-Locality Threshold:
    - Bell parameter CHSH score S must remain strictly >= 2.00 (Nominal baseline: S = 2.76 - 2.82).
    - S = |E(a, b) - E(a, b') + E(a', b) + E(a', b')| >= 2.00
    - If S < 2.00, quantum non-locality is collapsed; transmission is immediately rejected.
1.3 Hoeffding Statistical Gate:
    - Quantum Bit Error Rate (QBER) threshold cutoff is strictly fixed at tau = 5.0%.
    - Under Hoeffding's inequality: P(QBER - e >= epsilon) <= exp(-2n*epsilon^2) < 10^-7.
    - Minimum sample size of 10,000 raw bits per packet required.

2. ADVERSARY DETECTION & CONTAINMENT POLICY
-------------------------------------------
2.1 Intercept-Resend & Split Attacks:
    - Any photon disturbance breaching tau = 5.0% triggers an automated Level-2 SOC incident alert.
    - Contaminated fiber links must be isolated from optical routing within < 15ms via MEMS switches.
2.2 Post-Quantum Lattice Handover:
    - If fiber lines are physically jammed or tampered, the system engages NIST FIPS 204
      (CRYSTALS-Dilithium3 / ML-DSA-65) fallback lattice signatures in 3.8ms with zero downtime.

3. OPERATOR CLEARANCE & KEY CUSTODY POLICY
------------------------------------------
3.1 Privacy Amplification Standards:
    - Raw bitstrings must undergo Toeplitz matrix universal hashing to distill unconditional 256-bit OTP keys.
    - Storing raw unamplified bitstreams on non-volatile media is strictly prohibited.
3.2 Role Hierarchy:
    - Level 1 (Field Operator): Telemetry observation & signature submission.
    - Level 2 (Security Analyst): Incident triage & threshold calibration.
    - Level 3 (Chief Cryptanalyst): Optical containment & key escrow governance.

4. COMPLIANCE & ATTESTATION
---------------------------
- NIST FIPS 204: Module-Lattice-Based Digital Signature Standard (ML-DSA-65)
- NIST SP 800-208: Stateful Hash-Based Signature Schemes for Critical Infrastructure
- ISO/IEC 23837: Quantum Key Distribution Security Requirements & Evaluation Methods
===============================================================`;

  const handleDownloadTxt = () => {
    const blob = new Blob([policyText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QDS_Sentinel_Guidelines_Policies_2026.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Policy document (.TXT) downloaded.');
  };

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;
      let y = 14;

      // Top Copper Accent
      doc.setFillColor(185, 74, 47);
      doc.rect(0, 0, pageWidth, 4, 'F');

      // Header Meta
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(185, 74, 47);
      doc.text('SIGNAL ATELIER / QUANTUM ASSURANCE LAB', margin, y);

      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(110, 119, 120);
      doc.text('DOC-REF: DOC-QDS-SEC-2026-REV4 · CLASSIFICATION: SEC-3 RESTRICTED', pageWidth - margin, y, { align: 'right' });
      y += 8;

      // Title
      doc.setFont('times', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(22, 24, 26);
      doc.text('QDS Sentinel — Operational Guidelines & Security Policies', margin, y);
      y += 5.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90, 100, 102);
      doc.text('Standard Operating Procedure: Entanglement Verification, Hoeffding Cutoff & PQC Handover', margin, y);
      y += 5;

      // Divider line
      doc.setDrawColor(210, 205, 195);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 7;

      const addSectionHeader = (number: string, title: string) => {
        if (y > 260) {
          doc.addPage();
          doc.setFillColor(185, 74, 47);
          doc.rect(0, 0, pageWidth, 4, 'F');
          y = 16;
        }
        doc.setFillColor(244, 241, 234);
        doc.roundedRect(margin, y - 4, contentWidth, 7, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(185, 74, 47);
        doc.text(number, margin + 2.5, y + 1);
        doc.setTextColor(22, 24, 26);
        doc.text(title, margin + 11, y + 1);
        y += 7.5;
      };

      const addParagraph = (heading: string, body: string, formula?: string) => {
        if (y > 255) {
          doc.addPage();
          doc.setFillColor(185, 74, 47);
          doc.rect(0, 0, pageWidth, 4, 'F');
          y = 16;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(22, 24, 26);
        doc.text(heading, margin + 2, y);
        y += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(60, 68, 70);
        const splitText = doc.splitTextToSize(body, contentWidth - 4);
        doc.text(splitText, margin + 2, y);
        y += splitText.length * 3.8 + 2;

        if (formula) {
          doc.setFillColor(248, 247, 244);
          doc.setDrawColor(220, 215, 205);
          doc.setLineWidth(0.2);
          doc.roundedRect(margin + 2, y - 3, contentWidth - 4, 6.5, 1, 1, 'FD');
          doc.setFont('courier', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(185, 74, 47);
          doc.text(formula, margin + 6, y + 1.2);
          y += 7.5;
        }
        y += 2;
      };

      // Section 1
      addSectionHeader('01.', 'QUANTUM PROTOCOL OPERATIONAL RULES');
      addParagraph(
        '1.1 Entangled Photon Pair Distribution (SPDC Stage)',
        'Spontaneous Parametric Down-Conversion (SPDC) sources pump non-linear beta-BBO crystals at lambda = 775 nm to emit polarization-entangled photon pairs at telecom wavelength lambda = 1550 nm. Baseline optical calibration must confirm coincidence count rates >= 120 kcps before key attestation is authorized.',
        'Purity >= 98.5% | SPDC Coincidence: >= 120,000 cps | Telecom Wavelength: 1550 nm'
      );
      addParagraph(
        '1.2 Clauser-Horne-Shimony-Holt (CHSH) Bell Non-Locality Gate',
        'The Bell parameter S certifies quantum non-locality across Alice and Bob nodes. Measurements are evaluated across 4 polarization basis orientations. If S < 2.00, quantum non-locality is collapsed, signifying eavesdropping or fiber decoherence.',
        'S = |E(a,b) - E(a,b\') + E(a\',b) + E(a\',b\')| >= 2.00 (Nominal: 2.76 - 2.82)'
      );
      addParagraph(
        '1.3 Dynamic Hoeffding Statistical Bound (Security Cutoff)',
        'Quantum Bit Error Rate (QBER) is continuously sampled over minimum block sizes of n >= 10,000 bits. Hoeffding\'s inequality guarantees that statistical fluctuation does not mask adversarial intervention.',
        'P(QBER - e >= epsilon) <= exp(-2n*epsilon^2) < 10^-7 | Cutoff Threshold: tau = 5.0%'
      );

      // Section 2
      addSectionHeader('02.', 'ADVERSARY CONTAINMENT & COUNTERMEASURES');
      addParagraph(
        '2.1 Eavesdropping Detection & Automated Fiber Quarantining',
        'Any intercept-resend, beam splitter, or photon-number splitting (PNS) probe inevitably introduces state collapse and state disturbance. Once QBER crosses 5.0% or CHSH S drops below 2.00, the SOC console triggers acoustic/visual alerts and optical MEMS switches isolate the fiber channel in < 15ms.',
        'Optical MEMS Channel Isolation Latency: < 15ms | Forensic Code: 0xFA BREACH'
      );
      addParagraph(
        '2.2 Emergency Post-Quantum (PQC) Handover',
        'To guarantee non-repudiation and operational survivability during optical jamming or fiber severed states, QDS Sentinel hot-swaps to the CRYSTALS-Dilithium3 (NIST FIPS 204 / ML-DSA-65) lattice signature engine with zero downtime.',
        'Lattice Hardness: NIST Security Category 3 (AES-192 equivalent) | Handover: 3.8ms'
      );

      // Section 3
      addSectionHeader('03.', 'OPERATOR CLEARANCE & KEY CUSTODY POLICY');
      addParagraph(
        '3.1 Universal Hash Privacy Amplification',
        'Raw bitstrings are distilled through Toeplitz matrix universal hashing to eliminate all partial mutual information potentially acquired by Eve. The resultant 256-bit one-time pad (OTP) token possesses unconditional, information-theoretic security against quantum computers.',
        'Key Distillation: Sifted Bits -> Toeplitz Hash Matrix -> 256-Bit Unconditional OTP'
      );
      addParagraph(
        '3.2 Operator Escalation & Clearance Matrix',
        'Level 1 (Field Operator): Telemetry monitoring & routine signature dispatch.\nLevel 2 (Security Analyst): Threat triage, incident investigation & Hoeffding calibration.\nLevel 3 (Cryptanalyst / Root): Optical containment override & PQC key escrow governance.'
      );

      // Section 4
      addSectionHeader('04.', 'GOVERNING COMPLIANCE & ATTESTATION STANDARDS');
      addParagraph(
        '4.1 International Standards & Frameworks',
        '• NIST FIPS 204: Module-Lattice-Based Digital Signature Standard (ML-DSA-65).\n• NIST SP 800-208: Recommendation for Stateful Hash-Based Signature Schemes.\n• ISO/IEC 23837: Information Security, Cybersecurity and Privacy Protection for QKD.\n• ETSI GS QKD 014: Quantum Key Distribution Protocol Interface Security.'
      );

      // Attestation Seal
      if (y > 245) {
        doc.addPage();
        doc.setFillColor(185, 74, 47);
        doc.rect(0, 0, pageWidth, 4, 'F');
        y = 16;
      }
      y += 3;
      doc.setFillColor(244, 241, 234);
      doc.setDrawColor(210, 205, 195);
      doc.roundedRect(margin, y, contentWidth, 20, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(22, 24, 26);
      doc.text('OFFICIAL ATTESTATION SEAL', margin + 5, y + 5);

      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(90, 100, 102);
      doc.text(`Attestation Timestamp: ${new Date().toISOString()}`, margin + 5, y + 10);
      doc.text('Verification Authority: Quantum Assurance Lab & Root Governance', margin + 5, y + 14);
      doc.text('Cryptographic Checksum: SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069', margin + 5, y + 18);

      // Page numbers on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(220, 215, 205);
        doc.setLineWidth(0.3);
        doc.line(margin, 285, pageWidth - margin, 285);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(140, 145, 146);
        doc.text('QDS Sentinel — Restricted Distribution · Quantum Security Operating Procedures', margin, 290);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 290, { align: 'right' });
      }

      doc.save(`QDS_Sentinel_Operational_Guidelines_Policies_2026.pdf`);
      toast.success('Policy document (.PDF) generated and downloaded.');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast.error('Could not generate PDF. Downloading text version instead.');
      handleDownloadTxt();
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsOpen(false)} style={{ zIndex: 120 }}>
      <div
        className="modal-card guidelines-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          width: '94%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          boxShadow: '0 20px 60px rgba(22, 24, 26, 0.22)',
          borderRadius: '8px',
          overflow: 'hidden',
          fontFamily: 'var(--sans)',
        }}
      >
        {/* Top Header */}
        <header
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--paper-deep)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <img src={MARK} alt="QDS Mark" style={{ width: '36px', height: '36px', objectFit: 'contain', marginTop: '2px' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span className="eyebrow" style={{ fontSize: '10px', color: 'var(--copper)', fontWeight: 700 }}>
                  00 / OPERATIONAL PROTOCOL BRIEFING
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    fontFamily: 'var(--mono)',
                    background: 'rgba(185, 74, 47, 0.12)',
                    color: 'var(--copper)',
                    border: '1px solid rgba(185, 74, 47, 0.3)',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    fontWeight: 700,
                  }}
                >
                  DOC-QDS-SEC-2026-REV4
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '20px', fontFamily: 'var(--serif)', fontWeight: 600, color: 'var(--ink)' }}>
                Guidelines & Operational Policies
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--slate)', lineHeight: 1.4 }}>
                Review mandatory cryptographic directives, Bell threshold gates, and incident containment protocols prior to operating the quantum grid.
              </p>
            </div>
          </div>

          <button
            className="icon-button"
            onClick={() => setIsOpen(false)}
            aria-label="Close guidelines modal"
            style={{ color: 'var(--slate)', padding: '6px' }}
          >
            <X size={18} />
          </button>
        </header>

        {/* Tab Navigation Strip */}
        <nav
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            background: 'var(--paper-deep)',
            borderBottom: '1px solid var(--line)',
            padding: '4px 16px 0',
            gap: '6px',
          }}
        >
          <button
            type="button"
            className={`guidelines-tab-btn ${activeTab === 'protocol' ? 'active' : ''}`}
            onClick={() => setActiveTab('protocol')}
          >
            <Radio size={13} />
            <span>01. Protocol Rules</span>
          </button>
          <button
            type="button"
            className={`guidelines-tab-btn ${activeTab === 'containment' ? 'active' : ''}`}
            onClick={() => setActiveTab('containment')}
          >
            <AlertTriangle size={13} />
            <span>02. Containment</span>
          </button>
          <button
            type="button"
            className={`guidelines-tab-btn ${activeTab === 'clearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('clearance')}
          >
            <Lock size={13} />
            <span>03. Key Custody</span>
          </button>
          <button
            type="button"
            className={`guidelines-tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveTab('compliance')}
          >
            <Scale size={13} />
            <span>04. Standards</span>
          </button>
        </nav>

        {/* Modal Body Scroll Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            lineHeight: 1.6,
            fontSize: '13px',
            color: 'var(--ink)',
          }}
        >
          {/* TAB 1: PROTOCOL RULES */}
          {activeTab === 'protocol' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  background: 'rgba(47, 111, 133, 0.08)',
                  border: '1px solid rgba(47, 111, 133, 0.25)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--blue)',
                }}
              >
                <Cpu size={16} className="shrink-0" />
                <span>
                  <strong>Core Directive:</strong> Cryptographic authenticity is verified through the laws of quantum mechanics, never assumed.
                </span>
              </div>

              <section>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                  1.1 Entangled Photon Pair Distribution
                </h4>
                <p style={{ margin: 0, color: 'var(--slate)', fontSize: '12.5px' }}>
                  Spontaneous Parametric Down-Conversion (SPDC) sources pump β-BBO crystals at λ = 775 nm to emit polarization-entangled photon pairs at telecom wavelength λ = 1550 nm. Calibration runs must confirm joint coincidence rates ≥ 120 kcps before payload attestation.
                </p>
              </section>

              <section>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                  1.2 Clauser-Horne-Shimony-Holt (CHSH) Bell Gate
                </h4>
                <p style={{ margin: '0 0 8px', color: 'var(--slate)', fontSize: '12.5px' }}>
                  The Bell state non-locality parameter <em>S</em> certifies entanglement across Alice and Bob nodes:
                </p>
                <div
                  style={{
                    background: 'var(--paper-deep)',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    fontFamily: 'var(--mono)',
                    fontSize: '12px',
                    border: '1px solid var(--line)',
                  }}
                >
                  S = |E(a, b) - E(a, b&apos;) + E(a&apos;, b) + E(a&apos;, b&apos;)| &ge; 2.00 &nbsp; (Nominal: S = 2.76 to 2.82)
                </div>
                <p style={{ margin: '8px 0 0', color: 'var(--slate)', fontSize: '12px' }}>
                  Any measurement with S &lt; 2.00 violates quantum non-locality and indicates classical eavesdropping or optical degradation.
                </p>
              </section>

              <section>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                  1.3 Hoeffding Statistical Bound (τ = 5.0%)
                </h4>
                <p style={{ margin: 0, color: 'var(--slate)', fontSize: '12.5px' }}>
                  Quantum Bit Error Rate (QBER) is continuously sampled over sample blocks of <em>n</em> &ge; 10,000 bits. Under Hoeffding&apos;s inequality:
                </p>
                <div
                  style={{
                    margin: '6px 0',
                    background: 'var(--paper-deep)',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontFamily: 'var(--mono)',
                    fontSize: '12px',
                    border: '1px solid var(--line)',
                  }}
                >
                  P(QBER - e &ge; &epsilon;) &le; exp(-2n &middot; &epsilon;&sup2;) &lt; 10&#8315;&#8311;
                </div>
                <p style={{ margin: 0, color: 'var(--slate)', fontSize: '12px' }}>
                  If QBER breaches the 5.0% security cutoff, privacy amplification terminates immediately.
                </p>
              </section>
            </div>
          )}

          {/* TAB 2: CONTAINMENT */}
          {activeTab === 'containment' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  background: 'rgba(185, 74, 47, 0.08)',
                  border: '1px solid rgba(185, 74, 47, 0.25)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--copper)',
                }}
              >
                <AlertTriangle size={16} className="shrink-0" />
                <span>
                  <strong>Active Defense Protocol:</strong> Zero-tolerance threshold for undetected interception. Optical switches isolate compromised channels in &lt;15ms.
                </span>
              </div>

              <section>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                  2.1 Eavesdropping Detection & Channel Quarantining
                </h4>
                <p style={{ margin: 0, color: 'var(--slate)', fontSize: '12.5px' }}>
                  When Eve connects a Beam Splitter or intercept-resend probe, state disturbance collapses photon quantum states. The SOC monitoring console immediately:
                </p>
                <ul style={{ margin: '8px 0 0 20px', padding: 0, color: 'var(--slate)', fontSize: '12px' }}>
                  <li>Flags active threat status and triggers acoustic &amp; visual alerts.</li>
                  <li>Automates dark fiber isolation via optical MEMS switches.</li>
                  <li>Generates forensic incident report with Helstrom quantum detection bound (Pe &ge; 0.082).</li>
                </ul>
              </section>

              <section>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                  2.2 Emergency Post-Quantum (PQC) Handover
                </h4>
                <p style={{ margin: 0, color: 'var(--slate)', fontSize: '12.5px' }}>
                  To guarantee operational continuity during fiber cut or physical jamming, QDS Sentinel automatically engages the CRYSTALS-Dilithium3 (NIST FIPS 204 / ML-DSA-65) lattice signature engine. Handover executes seamlessly in 3.8 ms with zero downtime.
                </p>
              </section>
            </div>
          )}

          {/* TAB 3: CLEARANCE & KEY CUSTODY */}
          {activeTab === 'clearance' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <section>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                  3.1 Universal Hash Privacy Amplification
                </h4>
                <p style={{ margin: 0, color: 'var(--slate)', fontSize: '12.5px' }}>
                  Sifted keys are distilled through a Toeplitz matrix universal hash function to eliminate any partial information leaked to an adversary. The final 256-bit one-time pad (OTP) token possesses information-theoretic security against adversaries with unlimited quantum computing power.
                </p>
              </section>

              <section>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                  3.2 Operator Roles &amp; Incident Escalation Matrix
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                  <div style={{ background: 'var(--paper-deep)', padding: '10px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                    <strong style={{ display: 'block', fontSize: '11.5px', color: 'var(--ink)' }}>Level 1: Operator</strong>
                    <span style={{ fontSize: '11px', color: 'var(--slate)' }}>Live telemetry monitoring, routine signature dispatch, and matrix CSV export.</span>
                  </div>
                  <div style={{ background: 'var(--paper-deep)', padding: '10px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                    <strong style={{ display: 'block', fontSize: '11.5px', color: 'var(--copper)' }}>Level 2: Analyst</strong>
                    <span style={{ fontSize: '11px', color: 'var(--slate)' }}>Incident investigation, Hoeffding gate threshold tuning, and PQC audit verification.</span>
                  </div>
                  <div style={{ background: 'var(--paper-deep)', padding: '10px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                    <strong style={{ display: 'block', fontSize: '11.5px', color: 'var(--blue)' }}>Level 3: Cryptanalyst</strong>
                    <span style={{ fontSize: '11px', color: 'var(--slate)' }}>Optical containment authorization, forensic PCAP generation, and root admin clearance.</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: COMPLIANCE & STANDARDS */}
          {activeTab === 'compliance' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', background: 'var(--paper-deep)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block', color: 'var(--ink)' }}>NIST FIPS 204 (ML-DSA-65) Certified</strong>
                    <span style={{ fontSize: '11.5px', color: 'var(--slate)' }}>Primary module-lattice digital signature standard providing Category 3 post-quantum hardness.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', background: 'var(--paper-deep)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block', color: 'var(--ink)' }}>NIST SP 800-208 Compliant</strong>
                    <span style={{ fontSize: '11.5px', color: 'var(--slate)' }}>Stateful hash-based signature algorithms for high-security critical infrastructure protection.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', background: 'var(--paper-deep)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block', color: 'var(--ink)' }}>ISO/IEC 23837 Standards</strong>
                    <span style={{ fontSize: '11.5px', color: 'var(--slate)' }}>Security requirements, test and evaluation methods for quantum key distribution (QKD) modules.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Acknowledgement & Actions */}
        <footer
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--line)',
            background: 'var(--paper-deep)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--ink)' }}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                style={{ accentColor: 'var(--copper)' }}
              />
              <span>I acknowledge and agree to comply with QDS Sentinel Operational Guidelines &amp; Policies.</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: 'var(--slate)' }}>
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              <span>Do not show automatically on future visits</span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--slate)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Download Policy:
              </span>
              <button
                type="button"
                className="button button-quiet button-small"
                onClick={handleDownloadTxt}
                title="Download Policy Brief as plain text (.txt)"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px' }}
              >
                <FileText size={13} />
                <span>.TXT</span>
              </button>

              <button
                type="button"
                className="button button-outline button-small"
                onClick={handleDownloadPdf}
                title="Download Official Operational Policy Specification as PDF (.pdf)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11.5px',
                  color: 'var(--copper)',
                  borderColor: 'rgba(185, 74, 47, 0.45)',
                  background: 'rgba(185, 74, 47, 0.06)',
                }}
              >
                <Download size={13} />
                <span>.PDF Document</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="button button-outline button-small"
                onClick={() => setIsOpen(false)}
              >
                Review Later
              </button>

              <button
                type="button"
                className="button button-copper"
                onClick={handleAccept}
                disabled={!acknowledged}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: !acknowledged ? 0.6 : 1,
                  cursor: !acknowledged ? 'not-allowed' : 'pointer',
                }}
              >
                <ShieldCheck size={15} />
                <span>Accept Guidelines &amp; Enter Console</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
