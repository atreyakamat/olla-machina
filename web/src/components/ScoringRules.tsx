import type { UseCase, QuantLevel } from '@shared/engine';
import { QUANT_LABELS, QUANT_QUALITY_SCORES, QUANT_VRAM_BYTES_PER_PARAM } from '@shared/engine';

export default function ScoringRules() {
  return (
    <div className="scoring-rules">
      <h2>How OllamaFit Works</h2>
      <div className="rules-grid">
        <div className="rule-card">
          <h3>1. VRAM Feasibility</h3>
          <p>The model must fit in your GPU's VRAM. We calculate this as:</p>
          <code>VRAM = Parameters * BytesPerParam * 1.03 (Overhead)</code>
          <p className="hint">We prefer models with at least 15% VRAM headroom for smooth performance.</p>
        </div>

        <div className="rule-card">
          <h3>2. Quantization Quality</h3>
          <p>Quantization reduces model size but impacts quality:</p>
          <ul className="quant-list">
            {Object.entries(QUANT_LABELS).map(([key, label]) => (
              <li key={key}>
                <strong>{label} ({key}):</strong> {Math.round(QUANT_QUALITY_SCORES[key as QuantLevel] * 100)}% quality, {QUANT_VRAM_BYTES_PER_PARAM[key as QuantLevel].toFixed(2)} bytes/param.
              </li>
            ))}
          </ul>
        </div>

        <div className="rule-card">
          <h3>3. Use Case Matching</h3>
          <p>Models are scored higher if their training matches your intent:</p>
          <ul className="use-case-list">
            <li><strong>Chat:</strong> Instruction-tuned for conversation.</li>
            <li><strong>Coding:</strong> Specialized in Python, JS, C++, etc.</li>
            <li><strong>RAG:</strong> Large context windows and accurate retrieval.</li>
          </ul>
        </div>

        <div className="rule-card">
          <h3>4. Composite Scoring</h3>
          <p>Our final recommendation score is a weighted average:</p>
          <ul>
            <li>40% VRAM Fit (Safety first)</li>
            <li>30% Speed (TPS estimate)</li>
            <li>20% Quality (Quantization level)</li>
            <li>10% Recency (Newer is usually better)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
