import { Recommendation, QUANT_LABELS } from '@shared/engine';
import RecommendationCard from './RecommendationCard';

interface RecommendationsListProps {
  recommendations: {
    recommendations: Recommendation[];
    alternatives: Recommendation[];
    reasoning: {
      filtered_by_use_case: number;
      filtered_by_vram: number;
      final_candidates: number;
    };
  };
  copiedCommand: string | null;
  onCopy: (command: string) => void;
}

function RecommendationsList({ 
  recommendations, 
  copiedCommand, 
  onCopy 
}: RecommendationsListProps) {
  const { recommendations: primary, alternatives, reasoning } = recommendations;

  return (
    <div className="recommendations">
      <div className="recommendations-header">
        <h2>Your Recommendations</h2>
        <p className="stats">
          Evaluated {reasoning.final_candidates} models from the database
        </p>
      </div>

      {primary.length > 0 && (
        <div className="primary-section">
          <h3 className="section-title">
            <span className="badge best">Best Fit</span>
          </h3>
          {primary.map((rec, index) => (
            <RecommendationCard
              key={`${rec.model_id}-${rec.quantization}-${index}`}
              recommendation={rec}
              rank={0}
              isHero={true}
              copiedCommand={copiedCommand}
              onCopy={onCopy}
            />
          ))}
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="alternatives-section">
          <h3 className="section-title">Alternatives</h3>
          <div className="alternatives-grid">
            {alternatives.map((rec, index) => (
              <RecommendationCard
                key={`${rec.model_id}-${rec.quantization}-alt-${index}`}
                recommendation={rec}
                rank={index + 1}
                isHero={false}
                copiedCommand={copiedCommand}
                onCopy={onCopy}
              />
            ))}
          </div>
        </div>
      )}

      {primary.length === 0 && alternatives.length === 0 && (
        <div className="no-results">
          <h3>No models found</h3>
          <p>Try adjusting your hardware specifications or use case.</p>
        </div>
      )}
    </div>
  );
}

export default RecommendationsList;
