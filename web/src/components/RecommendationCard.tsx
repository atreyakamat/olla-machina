import { Recommendation, QUANT_LABELS } from '@shared/engine';

interface RecommendationCardProps {
  recommendation: Recommendation;
  rank: number;
  isHero: boolean;
  copiedCommand: string | null;
  onCopy: (command: string) => void;
}

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
    <div className={`card ${isHero ? 'hero' : ''}`}>
      <div className="card-header">
        <div className="model-info">
          <h3 className="model-name">
            {recommendation.model_name}:{recommendation.variant}
          </h3>
          <span className={`quality-badge ${recommendation.quality_tier}`}>
            {QUANT_LABELS[recommendation.quantization]}
          </span>
        </div>
        {isHero && <span className="best-badge">Best Fit</span>}
      </div>

      <div className="card-body">
        <div className="specs-grid">
          <div className="spec">
            <span className="spec-label">VRAM Required</span>
            <span className="spec-value">{vramRequired} GB</span>
          </div>
          <div className="spec">
            <span className="spec-label">Headroom</span>
            <span className="spec-value">{headroom} GB</span>
          </div>
          {recommendation.estimated_tps && (
            <div className="spec">
              <span className="spec-label">Est. Speed</span>
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
