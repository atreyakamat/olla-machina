import { useState, useEffect } from 'react';
import RecommendationsList from './components/RecommendationsList';
import { 
  Fingerprint, 
  scoreRecommendations, 
  parseModelsFromYAML,
  QUANT_LABELS,
  Model,
  HardwareSpec,
  UseCase
} from '@shared/engine';
import yaml from 'js-yaml';
import './App.css';

const USE_CASE_OPTIONS: { value: UseCase; label: string }[] = [
  { value: 'chat', label: 'Chat (conversation, Q&A)' },
  { value: 'coding', label: 'Coding (code generation, debugging)' },
  { value: 'rag', label: 'RAG (document Q&A, embeddings)' },
  { value: 'vision', label: 'Vision (image understanding)' },
  { value: 'embedding', label: 'Embedding (vector search)' },
  { value: 'summarization', label: 'Summarization (text summarization)' },
];

const GPU_OPTIONS = [
  { value: 'rtx-4090', label: 'NVIDIA RTX 4090 (24GB)', vram: 24 },
  { value: 'rtx-4080-super', label: 'NVIDIA RTX 4080 Super (16GB)', vram: 16 },
  { value: 'rtx-4070-ti', label: 'NVIDIA RTX 4070 Ti (12GB)', vram: 12 },
  { value: 'rtx-4060-ti', label: 'NVIDIA RTX 4060 Ti (16GB)', vram: 16 },
  { value: 'rtx-3080', label: 'NVIDIA RTX 3080 (10GB)', vram: 10 },
  { value: 'rtx-3070', label: 'NVIDIA RTX 3070 (8GB)', vram: 8 },
  { value: 'rtx-3060', label: 'NVIDIA RTX 3060 (12GB)', vram: 12 },
  { value: 'a100', label: 'NVIDIA A100 (40GB)', vram: 40 },
  { value: 'a6000', label: 'NVIDIA RTX A6000 (48GB)', vram: 48 },
  { value: 'm4-max', label: 'Apple M4 Max (64GB unified)', vram: 64, type: 'metal' },
  { value: 'm3-ultra', label: 'Apple M3 Ultra (96GB unified)', vram: 96, type: 'metal' },
  { value: 'm3-max', label: 'Apple M3 Max (36GB unified)', vram: 36, type: 'metal' },
  { value: 'm3-pro', label: 'Apple M3 Pro (18GB unified)', vram: 18, type: 'metal' },
  { value: 'm2-ultra', label: 'Apple M2 Ultra (128GB unified)', vram: 128, type: 'metal' },
  { value: 'm2-max', label: 'Apple M2 Max (32GB unified)', vram: 32, type: 'metal' },
  { value: 'm2-pro', label: 'Apple M2 Pro (16GB unified)', vram: 16, type: 'metal' },
  { value: 'm1-ultra', label: 'Apple M1 Ultra (64GB unified)', vram: 64, type: 'metal' },
  { value: 'amd-rx-7900-xtx', label: 'AMD RX 7900 XTX (24GB)', vram: 24, type: 'amd' },
  { value: 'amd-rx-7900-xt', label: 'AMD RX 7900 XT (20GB)', vram: 20, type: 'amd' },
  { value: 'amd-rx-7800-xt', label: 'AMD RX 7800 XT (16GB)', vram: 16, type: 'amd' },
];

interface OllamaInfo {
  version?: string;
  os?: string;
  gpu?: {
    name?: string;
    memory_total?: number;
  }[];
}

function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'paste'>('form');
  const [selectedGPU, setSelectedGPU] = useState('rtx-4090');
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase>('chat');
  const [speedQuality, setSpeedQuality] = useState(3);
  const [contextWindow, setContextWindow] = useState(8192);
  const [pasteContent, setPasteContent] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [recommendations, setRecommendations] = useState<ReturnType<typeof scoreRecommendations> | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadModels() {
      try {
        const response = await fetch('/models.yaml');
        const text = await response.text();
        const data = yaml.load(text);
        const parsedModels = parseModelsFromYAML(data);
        setModels(parsedModels);
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    }
    loadModels();
  }, []);

  const handleGetRecommendations = () => {
    setIsLoading(true);
    
    try {
      let fingerprint: Fingerprint;
      
      if (activeTab === 'paste') {
        const ollamaInfo: OllamaInfo = JSON.parse(pasteContent);
        const gpu = ollamaInfo.gpu?.[0];
        const vramGB = gpu?.memory_total 
          ? Math.round(gpu.memory_total / (1024 * 1024 * 1024) * 10) / 10 
          : 8;
        const gpuModel = gpu?.name || 'Unknown GPU';
        
        const isMetal = navigator.platform.toLowerCase().includes('mac') || 
                       gpuModel.toLowerCase().includes('apple') ||
                       gpuModel.toLowerCase().includes('m1') ||
                       gpuModel.toLowerCase().includes('m2') ||
                       gpuModel.toLowerCase().includes('m3') ||
                       gpuModel.toLowerCase().includes('m4');
        
        const hardware: HardwareSpec = {
          gpu: {
            type: isMetal ? 'metal' : 'nvidia',
            model: gpuModel,
            vram_gb: vramGB,
          },
          cpu: {
            cores: navigator.hardwareConcurrency || 8,
            architecture: navigator.platform.includes('ARM') || navigator.platform.includes('Mac') ? 'arm64' : 'x86_64',
          },
          system_ram_gb: 16,
          os: navigator.platform.includes('Mac') ? 'macOS' : 
              navigator.platform.includes('Win') ? 'Windows' : 'Linux',
          unified_memory_gb: isMetal ? vramGB : undefined,
        };
        
        fingerprint = {
          fingerprint_id: 'paste_' + Date.now().toString(36),
          created_at: new Date().toISOString(),
          hardware,
          use_case: {
            primary: selectedUseCase,
            context_window_min: contextWindow,
          },
          preferences: {
            speed_vs_quality: speedQuality,
            max_vram_utilization: 0.85,
            single_user: true,
          },
          source: 'web_paste',
        };
      } else {
        const gpuOption = GPU_OPTIONS.find(g => g.value === selectedGPU);
        const vramGB = gpuOption?.vram || 8;
        const gpuType = gpuOption?.type || 'nvidia';
        
        const hardware: HardwareSpec = {
          gpu: {
            type: gpuType as any,
            model: gpuOption?.label.split('(')[0].trim() || 'Unknown',
            vram_gb: vramGB,
          },
          cpu: {
            cores: navigator.hardwareConcurrency || 8,
            architecture: 'x86_64',
          },
          system_ram_gb: 32,
          os: 'Linux',
          unified_memory_gb: gpuType === 'metal' ? vramGB : undefined,
        };
        
        fingerprint = {
          fingerprint_id: 'form_' + Date.now().toString(36),
          created_at: new Date().toISOString(),
          hardware,
          use_case: {
            primary: selectedUseCase,
            context_window_min: contextWindow,
          },
          preferences: {
            speed_vs_quality: speedQuality,
            max_vram_utilization: 0.85,
            single_user: true,
          },
          source: 'web_form',
        };
      }
      
      const result = scoreRecommendations(fingerprint, models);
      setRecommendations(result);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(text);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const speedQualityLabel = speedQuality === 1 ? 'Maximum Speed' :
                            speedQuality === 2 ? 'Fast' :
                            speedQuality === 3 ? 'Balanced' :
                            speedQuality === 4 ? 'Quality Focused' :
                            'Maximum Quality';

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">OllamaFit</h1>
          <p className="tagline">Find your perfect Ollama model for your hardware</p>
        </div>
      </header>

      <main className="main">
        <div className="input-section">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              Manual Selection
            </button>
            <button 
              className={`tab ${activeTab === 'paste' ? 'active' : ''}`}
              onClick={() => setActiveTab('paste')}
            >
              Paste Ollama Info
            </button>
          </div>

          <div className="form-container">
            {activeTab === 'form' ? (
              <div className="form">
                <div className="form-group">
                  <label htmlFor="gpu">Your GPU</label>
                  <select 
                    id="gpu" 
                    value={selectedGPU} 
                    onChange={(e) => setSelectedGPU(e.target.value)}
                    className="select"
                  >
                    <optgroup label="NVIDIA RTX">
                      {GPU_OPTIONS.filter(g => g.value.startsWith('rtx')).map(gpu => (
                        <option key={gpu.value} value={gpu.value}>{gpu.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="NVIDIA Data Center">
                      {GPU_OPTIONS.filter(g => g.value.startsWith('a')).map(gpu => (
                        <option key={gpu.value} value={gpu.value}>{gpu.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Apple Silicon">
                      {GPU_OPTIONS.filter(g => g.type === 'metal').map(gpu => (
                        <option key={gpu.value} value={gpu.value}>{gpu.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="AMD">
                      {GPU_OPTIONS.filter(g => g.type === 'amd').map(gpu => (
                        <option key={gpu.value} value={gpu.value}>{gpu.label}</option>
                      ))}
                    </optgroup>
                  </select>
                  <span className="hint">
                    {GPU_OPTIONS.find(g => g.value === selectedGPU)?.vram}GB VRAM
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="useCase">Primary Use Case</label>
                  <select 
                    id="useCase" 
                    value={selectedUseCase} 
                    onChange={(e) => setSelectedUseCase(e.target.value as UseCase)}
                    className="select"
                  >
                    {USE_CASE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="speedQuality">
                    Speed vs Quality: <strong>{speedQualityLabel}</strong>
                  </label>
                  <input 
                    type="range" 
                    id="speedQuality" 
                    min="1" 
                    max="5" 
                    value={speedQuality}
                    onChange={(e) => setSpeedQuality(parseInt(e.target.value))}
                    className="range"
                  />
                  <div className="range-labels">
                    <span>Faster</span>
                    <span>Quality</span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="contextWindow">Minimum Context Window</label>
                  <select 
                    id="contextWindow" 
                    value={contextWindow} 
                    onChange={(e) => setContextWindow(parseInt(e.target.value))}
                    className="select"
                  >
                    <option value={2048}>2K tokens</option>
                    <option value={4096}>4K tokens</option>
                    <option value={8192}>8K tokens</option>
                    <option value={16384}>16K tokens</option>
                    <option value={32768}>32K tokens</option>
                    <option value={65536}>64K tokens</option>
                    <option value={131072}>128K tokens</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="paste-mode">
                <div className="paste-instructions">
                  <p>Run this command in your terminal:</p>
                  <code>ollama info | jq .</code>
                  <p>Then paste the JSON output below:</p>
                </div>
                <textarea
                  className="textarea"
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder='{"version":"0.1.40","gpu":[{"name":"NVIDIA RTX 4090","memory_total":25769803776}]}'
                  rows={8}
                />
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label htmlFor="useCase2">Primary Use Case</label>
                  <select 
                    id="useCase2" 
                    value={selectedUseCase} 
                    onChange={(e) => setSelectedUseCase(e.target.value as UseCase)}
                    className="select"
                  >
                    {USE_CASE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button 
              className="button primary"
              onClick={handleGetRecommendations}
              disabled={isLoading || models.length === 0}
            >
              {isLoading ? 'Finding Models...' : 'Get Recommendations'}
            </button>
          </div>
        </div>

        {recommendations && (
          <RecommendationsList 
            recommendations={recommendations}
            copiedCommand={copiedCommand}
            onCopy={copyToClipboard}
          />
        )}
      </main>

      <footer className="footer">
        <p>OllamaFit - Spec-aware model intelligence layer for Ollama</p>
        <p className="stats">{models.length} models available</p>
      </footer>
    </div>
  );
}

export default App;
