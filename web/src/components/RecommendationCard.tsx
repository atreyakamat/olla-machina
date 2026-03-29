import { QUANT_LABELS } from '@shared/engine';
import type { Recommendation } from '@shared/engine';

interface RecommendationCardProps {
  recommendation: Recommendation;
  rank: number;
  isHero: boolean;
  copiedCommand: string | null;
  onCopy: (command: string) => void;
}

const Icons = {
  VRAM: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 12h4" />
      <path d="M14 12h4" />
    </svg>
  ),
  Memory: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 19v-3" />
      <path d="M10 19v-3" />
      <path d="M14 19v-3" />
      <path d="M18 19v-3" />
      <path d="M8 11V9" />
      <path d="M16 11V9" />
      <rect x="3" y="11" width="18" height="8" rx="2" />
      <path d="M3 15h18" />
      <path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6" />
    </svg>
  ),
  Bolt: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  Storage: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <line x1="6" y1="6" x2="6" y2="6" />
      <line x1="6" y1="18" x2="6" y2="18" />
    </svg>
  )
};

function RecommendationCard({
  recommendation,
  rank,
  isHero,
  copiedCommand,
  onCopy
}: RecommendationCardProps) {
  const isCopied = copiedCommand === recommendation.ollama_command;
  const headroom = recommendation.vram_headroom_gb.toFixed(1);
  const vramRequired = recommendation.vram_required_gb.toFixed(1);

  return (
    <div className={`card glass-card ${isHero ? 'hero' : ''}`}>
      <div className="card-header">
        <div className="model-info">
          <div className="model-header-top">
            <h3 className="model-name">
              {recommendation.model_name}:{recommendation.variant}
            </h3>
            {isHero && <span className="best-badge">Best Fit</span>}
          </div>
          <span className={`quality-badge ${recommendation.quality_tier}`}>
            {QUANT_LABELS[recommendation.quantization]} Quality
          </span>
        </div>
      </div>

      <div className="card-body">
        <div className="specs-grid">
          <div className="spec">
            <div className="spec-icon-label">
              <Icons.VRAM />
              <span className="spec-label">VRAM Req.</span>
            </div>
            <span className="spec-value">{vramRequired} GB</span>
          </div>
          <div className="spec">
            <div className="spec-icon-label">
              <Icons.Memory />
              <span className="spec-label">Headroom</span>
            </div>
            <span className="spec-value">{headroom} GB</span>
          </div>
          <div className="spec">
            <div className="spec-icon-label">
              <Icons.Storage />
              <span className="spec-label">Storage</span>
            </div>
            <span className="spec-value">~{(recommendation.vram_required_gb * 1.1).toFixed(1)} GB</span>
          </div>
          {recommendation.estimated_tps && (
            <div className="spec">
              <div className="spec-icon-label">
                <Icons.Bolt />
                <span className="spec-label">Est. Speed</span>
              </div>
              <span className="spec-value">~{recommendation.estimated_tps} tok/s</span>
            </div>
          )}
        </div>

        {recommendation.hybrid_mode && (
          <div className="hybrid-warning">
            <span className="warning-icon">⚠️</span>
            <span>
              Hybrid Mode: Uses {recommendation.hybrid_ram_required_gb?.toFixed(0)}GB system RAM 
              ({100 - Math.round(recommendation.estimated_tps ? 0 : 20)}% speed)
            </span>
          </div>
        )}

        <p className="reason">{recommendation.reason}</p>

        <div className="command-section">
          <code className="command">{recommendation.ollama_command}</code>
          <button 
            className={`copy-button ${isCopied ? 'copied' : ''}`}
            onClick={() => onCopy(recommendation.ollama_command)}
          >
            {isCopied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <div className="card-footer">
          <a 
            href={recommendation.huggingface_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="link"
          >
            View on Hugging Face →
          </a>
          {recommendation.community_reports > 0 && (
            <span className="reports">
              {recommendation.community_reports} community reports
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecommendationCard;
