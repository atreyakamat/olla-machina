import { useState, useEffect } from 'react';

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

export default function CloudSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<OpenRouterModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOpenRouterModels() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (!response.ok) throw new Error('Failed to fetch OpenRouter models');
        const data = await response.json();
        setAllModels(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }
    fetchOpenRouterModels();
  }, []);

  useEffect(() => {
    const filtered = allModels.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 20);
    setFilteredModels(filtered);
  }, [searchTerm, allModels]);

  return (
    <div className="search-container">
      <div className="search-instructions">
        <h3>Cloud Model Explorer (OpenRouter)</h3>
        <p>Explore high-end models available via OpenRouter API. Use these for RAG or complex reasoning when local hardware is insufficient.</p>
      </div>

      <div className="search-bar">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search models (e.g. Llama 3, Claude, GPT-4)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading && <p>Loading cloud models...</p>}
      {error && <p className="error">Error: {error}</p>}

      <div className="search-results">
        {filteredModels.map(model => (
          <div key={model.id} className="search-item">
            <div className="search-item-info">
              <h4>{model.name}</h4>
              <p>{model.id}</p>
              <p className="context-tag">Context: {Math.round(model.context_length / 1024)}k tokens</p>
            </div>
            <div className="search-item-meta">
              <span className="price-tag">
                ${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)} / 1M tokens
              </span>
              <div className="links">
                <a 
                  href={`https://openrouter.ai/models/${model.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="link"
                >
                  View on OpenRouter →
                </a>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && filteredModels.length === 0 && searchTerm && (
          <p className="no-results">No cloud models matching "{searchTerm}"</p>
        )}
      </div>
    </div>
  );
}
