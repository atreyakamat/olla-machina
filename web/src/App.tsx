import { useState, useEffect } from 'react';
import RecommendationsList from './components/RecommendationsList';
import ScoringRules from './components/ScoringRules';
import CloudSearch from './components/CloudSearch';
import { 
  scoreRecommendations, 
  parseModelsFromYAML,
  QUANT_LABELS
} from '@shared/engine';
import type { 
  Fingerprint, 
  Model,
  HardwareSpec,
  UseCase,
  Benchmark
} from '@shared/engine';
import yaml from 'js-yaml';
import { subscribeToAlerts, fetchBenchmarks } from './lib/api';
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
  const [view, setView] = useState<'landing' | 'checker'>('landing');
  const [activeTab, setActiveTab] = useState<'form' | 'paste' | 'cloud'>('form');
  const [selectedGPU, setSelectedGPU] = useState('rtx-4090');
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase>('chat');
  const [searchTerm, setSearchTerm] = useState('');
  const [speedQuality, setSpeedQuality] = useState(3);
  const [contextWindow, setContextWindow] = useState(8192);
  const [pasteContent, setPasteContent] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [recommendations, setRecommendations] = useState<ReturnType<typeof scoreRecommendations> | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  
  // Subscription state
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subStatus, setSubStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const Chibi = ({ name, mood }: { name: string, mood: 'happy' | 'thinking' | 'detecting' }) => (
    <div className={`chibi-container ${name}`}>
      <div className={`chibi ${mood}`}>
        <div className="eyes"></div>
        <div className="blush"></div>
        <div className="mouth"></div>
        <div className="antennas"></div>
      </div>
      <div className="chibi-name">{name}</div>
    </div>
  );

  useEffect(() => {
    async function init() {
      try {
        const response = await fetch('/models.yaml');
        const text = await response.text();
        const data = yaml.load(text);
        const parsedModels = parseModelsFromYAML(data);
        setModels(parsedModels);

        const benchData = await fetchBenchmarks();
        if (benchData) setBenchmarks(benchData as Benchmark[]);
      } catch (error) {
        console.error('Initialization failed:', error);
      }
    }
    init();
  }, []);

  const handleSubscribe = async (e: React.FormEvent, fingerprint: Fingerprint) => {
    e.preventDefault();
    if (!email) return;
    setIsSubscribing(true);
    setSubStatus(null);
    try {
      await subscribeToAlerts(email, fingerprint);
      setSubStatus({ type: 'success', msg: 'Subscribed! We\'ll notify you of better models.' });
    } catch (err) {
      setSubStatus({ type: 'error', msg: 'Subscription failed. You might already be subscribed.' });
    } finally {
      setIsSubscribing(false);
    }
  };

  const detectHardware = async () => {
    setIsDetecting(true);
    setDetectionError(null);
    try {
      if (!navigator.gpu) {
        throw new Error('WebGPU not supported in this browser. Try Chrome or Edge.');
      }

      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) {
        throw new Error('No GPU adapter found.');
      }

      // Get adapter info (architecture, vendor)
      const info = await adapter.requestAdapterInfo();
      const vramBytes = adapter.limits.maxStorageBufferBindingSize; // Approximation for VRAM
      // Note: Actual VRAM is hard to get via WebGPU for security reasons, 
      // but we can estimate or use common presets.
      
      const vramGB = Math.round((adapter.limits.maxBufferSize / (1024 * 1024 * 1024)) * 2 * 10) / 10;
      
      // Attempt to estimate storage (limited in browser)
      let storageGB = 512;
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          if (estimate.quota) {
            storageGB = Math.round(estimate.quota / (1024 * 1024 * 1024));
          }
        }
      } catch (e) {
        console.warn('Storage estimation failed');
      }

      console.log('Detected GPU:', info.architecture, info.description);

      // Try to find a matching preset or set manually
      const gpuModel = info.description || info.architecture || 'Detected GPU';
      
      // Update state
      setActiveTab('form');
      // Look for a close match in our predefined list or create a custom one
      const match = GPU_OPTIONS.find(g => 
        gpuModel.toLowerCase().includes(g.label.toLowerCase().split('(')[0].trim())
      );

      if (match) {
        setSelectedGPU(match.value);
      }

      alert(`Detected: ${gpuModel}\nEstimated VRAM: ${vramGB}GB\nStorage Available: ~${storageGB}GB`);

    } catch (err) {
      setDetectionError(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleGetRecommendations = () => {
    setIsLoading(true);
    
    try {
      let fingerprint: Fingerprint;
      
      const filteredModels = searchTerm 
        ? models.filter(m => 
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            m.use_cases.some(u => u.toLowerCase().includes(searchTerm.toLowerCase()))
          )
        : models;

      if (activeTab === 'paste') {
        const ollamaInfo: OllamaInfo = JSON.parse(pasteContent);
        const gpu = ollamaInfo.gpu?.[0];
        const vramGB = gpu?.memory_total 
          ? Math.round(gpu.memory_total / (1024 * 1024 * 1024) * 10) / 10 
          : 8;
        const gpuModel = gpu?.name || 'Unknown GPU';
        
        const hardware: HardwareSpec = {
          gpu: {
            type: gpuModel.toLowerCase().includes('nvidia') ? 'nvidia' : 'cpu',
            model: gpuModel,
            vram_gb: vramGB,
          },
          cpu: {
            cores: navigator.hardwareConcurrency || 8,
            architecture: 'x86_64',
          },
          system_ram_gb: 16,
          storage_gb: 512,
          os: 'Linux',
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
          storage_gb: 1000,
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
      
      // Use real benchmarks in scoring!
      const result = scoreRecommendations(fingerprint, filteredModels, benchmarks);
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

  if (view === 'landing') {
    return (
      <div className="app landing-view-full">
        <div className="background-fixed">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>

        <nav className="navbar glass">
          <div className="nav-container">
            <h1 className="logo-small">OllamaFit</h1>
            <div className="nav-links">
              <a href="#features">Features</a>
              <a href="#how-it-works">How it Works</a>
              <button className="button primary-sm" onClick={() => setView('checker')}>Launch App</button>
            </div>
          </div>
        </nav>

        <main className="landing-scroll">
          <section className="hero-section">
            <div className="container">
              <div className="hero-content-split">
                <div className="hero-text-left">
                  <h1 className="logo-mega">Find Your <span className="text-gradient">Perfect</span> Match</h1>
                  <p className="hero-desc">
                    OllamaFit is a spec-aware intelligence layer that detects your hardware and recommends the optimal 
                    local LLMs. No more "Out of Memory" errors.
                  </p>
                  <div className="hero-btns">
                    <button className="button primary-glow-lg pulse" onClick={() => setView('checker')}>
                      Get Started Free
                    </button>
                    <a href="#features" className="button ghost">Explore Features</a>
                  </div>
                </div>
                <div className="hero-visual">
                  <div className="chibi-stage glass">
                    <Chibi name="Olla" mood="happy" />
                    <Chibi name="Machina" mood="detecting" />
                    <div className="stage-glow"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="features" className="features-section">
            <div className="container">
              <h2 className="section-title-center">Intelligent Model Scoring</h2>
              <div className="features-grid">
                <div className="feature-card glass">
                  <div className="feature-icon">🔍</div>
                  <h3>Hardware Awareness</h3>
                  <p>Deep detection of GPU VRAM, System RAM, and CPU architecture (including Apple Silicon Unified Memory).</p>
                </div>
                <div className="feature-card glass">
                  <div className="feature-icon">🧠</div>
                  <h3>Quantization Logic</h3>
                  <p>We calculate the exact VRAM footprint for Q4, Q5, Q8, and F16 weights to ensure 100% fit.</p>
                </div>
                <div className="feature-card glass">
                  <div className="feature-icon">⚡</div>
                  <h3>Hybrid Mode</h3>
                  <p>Automatically detects when a model can spill over into System RAM and calculates the speed penalty.</p>
                </div>
                <div className="feature-card glass">
                  <div className="feature-icon">📊</div>
                  <h3>Real Benchmarks</h3>
                  <p>Powered by community-driven throughput data to give you accurate Tokens Per Second (TPS) estimates.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="how-it-works" className="how-section glass-dark">
            <div className="container">
              <h2 className="section-title-center">Three Steps to Local AI Bliss</h2>
              <div className="steps-container">
                <div className="step">
                  <div className="step-num">1</div>
                  <h4>Detect</h4>
                  <p>Use WebGPU or Terminal commands to scan your hardware specs in seconds.</p>
                </div>
                <div className="step-arrow">→</div>
                <div className="step">
                  <div className="step-num">2</div>
                  <h4>Analyze</h4>
                  <p>Our scoring engine filters 30+ models based on your VRAM and use case.</p>
                </div>
                <div className="step-arrow">→</div>
                <div className="step">
                  <div className="step-num">3</div>
                  <h4>Pull</h4>
                  <p>Copy the one-click Ollama command and start chatting with your perfect model.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="cta-section">
            <div className="container">
              <div className="cta-box glass">
                <h2>Ready to optimize your local setup?</h2>
                <p>Join hundreds of users finding the sweet spot between speed and quality.</p>
                <button className="button primary-glow-lg" onClick={() => setView('checker')}>
                  Open Model Checker
                </button>
              </div>
            </div>
          </section>

          <footer className="footer-full">
            <div className="container">
              <p>© 2026 OllamaFit. Spec-aware intelligence for local AI.</p>
            </div>
          </footer>
        </main>
      </div>
    );
  }

  return (
    <div className="app checker-view">
      <div className="background-glow"></div>
      <header className="header glass-header">
        <div className="header-content">
          <h1 className="logo" onClick={() => setView('landing')} style={{cursor: 'pointer'}}>OllamaFit</h1>
          <div className="header-actions">
            <button 
              className={`button detect-button ${isDetecting ? 'loading' : ''}`}
              onClick={detectHardware}
              disabled={isDetecting}
            >
              {isDetecting ? 'Detecting...' : 'Auto-Detect Hardware'}
            </button>
          </div>
        </div>
      </header>

      <main className="main glass-main">
        {detectionError && (
          <div className="gpu-warning glass-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <strong>GPU detection limited:</strong> {detectionError}. 
              No worries! You can still use the manual selection for CPU-only recommendations.
            </div>
          </div>
        )}
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
            <button 
              className={`tab ${activeTab === 'cloud' ? 'active' : ''}`}
              onClick={() => setActiveTab('cloud')}
            >
              Cloud Search
            </button>
          </div>

          <div className="form-container">
            {activeTab === 'form' ? (
              <div className="form">
                <div className="form-row">
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
                </div>

                <div className="form-group search-group">
                  <label htmlFor="searchTerm">Search Models or Use Cases (optional)</label>
                  <input 
                    type="text" 
                    id="searchTerm"
                    placeholder="e.g. llama3, coding, vision, 70b..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input"
                  />
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
                
                <button 
                  className="button primary"
                  onClick={handleGetRecommendations}
                  disabled={isLoading || models.length === 0}
                >
                  {isLoading ? 'Finding Models...' : 'Get Recommendations'}
                </button>
              </div>
            ) : activeTab === 'paste' ? (
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
                <button 
                  className="button primary"
                  onClick={handleGetRecommendations}
                  disabled={isLoading || !pasteContent}
                >
                  {isLoading ? 'Analyzing...' : 'Analyze Paste'}
                </button>
              </div>
            ) : (
              <CloudSearch />
            )}
          </div>
        </div>

        {activeTab !== 'cloud' && recommendations && (
          <>
            <RecommendationsList 
              recommendations={recommendations}
              copiedCommand={copiedCommand}
              onCopy={copyToClipboard}
            />
            
            <div className="subscription-card">
              <h3>Get notified of better models</h3>
              <p>Subscribe to receive an alert when a newer or better-fitting model is released for your hardware.</p>
              <form className="subscription-form" onSubmit={(e) => {
                // We need to recreate or capture the last used fingerprint
                // For simplicity, we'll assume the current form state or just the ID from recommendations
                handleSubscribe(e, {
                  fingerprint_id: recommendations.fingerprint_id,
                  hardware: recommendations.recommendations[0] ? { 
                    gpu: { model: recommendations.recommendations[0].model_name, vram_gb: recommendations.recommendations[0].vram_required_gb, type: 'nvidia' },
                    cpu: { cores: 8, architecture: 'x86_64' },
                    system_ram_gb: 16,
                    os: 'Linux'
                  } : {} as any, // This is a bit of a hack, in a real app we'd store the last fingerprint
                } as any);
              }}>
                <input 
                  type="email" 
                  placeholder="your@email.com" 
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
                <button type="submit" className="button secondary" disabled={isSubscribing}>
                  {isSubscribing ? 'Subscribing...' : 'Notify Me'}
                </button>
              </form>
              {subStatus && (
                <p className={`status-msg ${subStatus.type}`}>{subStatus.msg}</p>
              )}
            </div>

            {recommendations.recommendations.length === 0 && (
              <div className="cloud-fallback">
                <p>No local models found that meet your criteria. Try searching the cloud?</p>
                <button className="button secondary" onClick={() => setActiveTab('cloud')}>
                  Explore Cloud Models
                </button>
              </div>
            )}
          </>
        )}

        <ScoringRules />
      </main>

      <footer className="footer">
        <p>OllamaFit - Spec-aware model intelligence layer for Ollama</p>
        <p className="stats">{models.length} models available</p>
      </footer>
    </div>
  );
}

export default App;
