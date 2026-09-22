"""
GHZ Quantum Circuit generation and Qiskit simulation backend.

Implements genuine 3-qubit Greenberger-Horne-Zeilinger (GHZ) state preparation:
    |GHZ⟩ = (|000⟩ + |111⟩) / √2

Basis Transformation Mathematics:
- Computational / Z-basis: Direct projective measurement in {|0⟩, |1⟩}.
  Ideal outcomes: |000⟩ and |111⟩ with equal probability (50% each).
- Transverse / X-basis: Applying Hadamard gate H to qubit i rotates the basis:
  H|+⟩ = |0⟩, H|-⟩ = |1⟩.
  Under H^⊗3, |GHZ⟩ expands to:
  H^⊗3 |GHZ⟩ = 1/2 (|000⟩ + |011⟩ + |101⟩ + |110⟩)
  Notice all valid outcomes have EVEN PARITY (b0 ⊕ b1 ⊕ b2 = 0).
  Odd parity outcomes (|001⟩, |010⟩, |100⟩, |111⟩) indicate decoherence, noise, or eavesdropping.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    from qiskit import QuantumCircuit
    from qiskit_aer import AerSimulator
    HAS_QISKIT = True
except (ImportError, ModuleNotFoundError):
    HAS_QISKIT = False
    QuantumCircuit = None  # type: ignore
    AerSimulator = None    # type: ignore

from app.ghz.exceptions import GHZGenerationError, InvalidBasisError


class FallbackCircuitInstruction:
    def __init__(self, name: str):
        self.operation = type("Op", (), {"name": name})()


class FallbackQuantumCircuit:
    """Lightweight fallback representing a 3-qubit GHZ circuit when Qiskit is unavailable."""
    def __init__(self, num_qubits: int = 3, num_clbits: int = 3, basis: Optional[List[str]] = None):
        self.num_qubits = num_qubits
        self.num_clbits = num_clbits
        self.basis = basis or ["Z", "Z", "Z"]
        self.data = [
            FallbackCircuitInstruction("h"),
            FallbackCircuitInstruction("cx"),
            FallbackCircuitInstruction("cx"),
            FallbackCircuitInstruction("measure"),
        ]


logger = logging.getLogger("qds.ghz.circuit")


def _simulate_ghz_numpy(
    basis: List[str],
    shots: int = 1000,
    noise_rate: float = 0.0,
    seed: Optional[int] = None,
) -> Tuple[Dict[str, int], List[str]]:
    """Exact 3-qubit GHZ statevector simulation using NumPy."""
    rng = np.random.default_rng(seed)
    state = np.zeros((2, 2, 2), dtype=complex)
    state[0, 0, 0] = 1.0 / np.sqrt(2)
    state[1, 1, 1] = 1.0 / np.sqrt(2)

    H = np.array([[1, 1], [1, -1]], dtype=complex) / np.sqrt(2)
    for i, b in enumerate(basis):
        if b.upper() == "X":
            state = np.tensordot(H, state, axes=([1], [i]))
            state = np.moveaxis(state, 0, i)

    probs = np.abs(state.flatten()) ** 2
    probs /= np.sum(probs)

    indices = rng.choice(8, size=shots, p=probs)
    samples = [f"{idx:03b}" for idx in indices]

    if noise_rate > 0.0:
        noisy_samples = []
        for s in samples:
            bits = list(s)
            for j in range(3):
                if rng.random() < noise_rate:
                    bits[j] = "1" if bits[j] == "0" else "0"
            noisy_samples.append("".join(bits))
        samples = noisy_samples

    formatted_counts: Dict[str, int] = {}
    for s in samples:
        formatted_counts[s] = formatted_counts.get(s, 0) + 1

    return formatted_counts, samples


def create_ghz_circuit(
    basis: Optional[List[str]] = None,
    noise_rate: float = 0.0,
    seed: Optional[int] = None,
) -> Any:
    """
    Construct a 3-qubit GHZ quantum circuit with specified measurement bases.

    Circuit structure:
        q0: ──H────■──────────────[Basis Rot]──■──
                   │                           │
        q1: ───────X────■─────────[Basis Rot]──┼──■──
                        │                      │  │
        q2: ────────────X─────────[Basis Rot]──┼──┼──■
                                               │  │  │
        c:  ═══════════════════════════════════0══1══2

    Args:
        basis: List of 3 strings ('Z' or 'X') indicating measurement basis for each qubit [q0, q1, q2].
               Defaults to ['Z', 'Z', 'Z'].
        noise_rate: Artificial noise/error probability (0.0 to 1.0) applied via bit flips for testing.
        seed: Optional RNG seed.

    Returns:
        QuantumCircuit ready for simulation.
    """
    if basis is None:
        basis = ["Z", "Z", "Z"]

    if len(basis) != 3:
        raise InvalidBasisError(f"Basis list must have length 3, got {len(basis)}")

    # Normalize basis
    normalized_basis = [b.upper() for b in basis]
    for b in normalized_basis:
        if b not in ("Z", "X"):
            raise InvalidBasisError(b)

    if not HAS_QISKIT:
        return FallbackQuantumCircuit(3, 3, basis=normalized_basis)

    # 3 quantum qubits, 3 classical bits
    qc = QuantumCircuit(3, 3)

    # Step 1: Create entangled 3-qubit GHZ state (|000⟩ + |111⟩)/√2
    qc.h(0)
    qc.cx(0, 1)
    qc.cx(1, 2)

    # Step 2: Apply basis transformation prior to measurement
    for qubit_idx, b in enumerate(normalized_basis):
        if b == "X":
            # Rotate X-basis eigenstates (|+⟩, |-⟩) to computational basis (|0⟩, |1⟩)
            qc.h(qubit_idx)
        elif b == "Z":
            # Z-basis is already aligned with computational basis
            pass

    # Step 3: Measure all qubits into corresponding classical registers
    # Map q0 -> c0, q1 -> c1, q2 -> c2
    qc.measure([0, 1, 2], [0, 1, 2])

    return qc


def simulate_ghz(
    qc: Any,
    shots: int = 1000,
    noise_rate: float = 0.0,
    seed: Optional[int] = None,
) -> Tuple[Dict[str, int], List[str]]:
    """
    Simulate execution of the GHZ quantum circuit using Qiskit AerSimulator,
    with automatic graceful fallback to NumPy simulation if Aer is unavailable.

    Returns:
        Tuple of (formatted_counts, sample_list)
        where bitstrings are ordered as q0 q1 q2 (left-to-right matching participant index 0, 1, 2).
    """
    basis = getattr(qc, "basis", ["Z", "Z", "Z"])

    if HAS_QISKIT and isinstance(qc, QuantumCircuit) and AerSimulator is not None:
        try:
            simulator = AerSimulator(seed_simulator=seed)
            job = simulator.run(qc, shots=shots)
            result = job.result()
            raw_counts = result.get_counts(qc)

            # In Qiskit, get_counts bitstrings are little-endian: "c2 c1 c0".
            # We reformat them to big-endian order "c0 c1 c2" (q0 q1 q2) so that
            # index 0 corresponds to Participant 1 (q0), index 1 to Participant 2 (q1), index 2 to Participant 3 (q2).
            formatted_counts: Dict[str, int] = {}
            for raw_bitstring, count in raw_counts.items():
                clean_str = raw_bitstring.replace(" ", "")
                reordered = clean_str[::-1]
                formatted_counts[reordered] = count

            # Apply simulated channel noise if requested
            if noise_rate > 0.0:
                rng = np.random.default_rng(seed)
                noisy_counts: Dict[str, int] = {}
                for bitstring, count in formatted_counts.items():
                    for _ in range(count):
                        bits = list(bitstring)
                        for i in range(3):
                            if rng.random() < noise_rate:
                                bits[i] = "1" if bits[i] == "0" else "0"
                        noisy_bs = "".join(bits)
                        noisy_counts[noisy_bs] = noisy_counts.get(noisy_bs, 0) + 1
                formatted_counts = noisy_counts

            # Reconstruct list of individual shot samples
            samples: List[str] = []
            for bitstring, count in formatted_counts.items():
                samples.extend([bitstring] * count)

            return formatted_counts, samples

        except Exception as exc:
            logger.warning("AerSimulator failed, falling back to NumPy simulation: %s", exc)

    # Fallback to pure NumPy exact simulation
    try:
        return _simulate_ghz_numpy(basis=basis, shots=shots, noise_rate=noise_rate, seed=seed)
    except Exception as exc:
        logger.error("Error simulating GHZ circuit: %s", exc)
        raise GHZGenerationError(f"GHZ simulation failed: {exc}") from exc
