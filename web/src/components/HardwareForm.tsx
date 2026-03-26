import type { UseCase } from '@shared/engine';

interface HardwareFormProps {
  selectedGPU: string;
  selectedUseCase: UseCase;
  speedQuality: number;
  contextWindow: number;
  onGPUChange: (value: string) => void;
  onUseCaseChange: (value: UseCase) => void;
  onSpeedQualityChange: (value: number) => void;
  onContextWindowChange: (value: number) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const USE_CASE_OPTIONS: { value: UseCase; label: string }[] = [
  { value: 'chat', label: 'Chat (conversation, Q&A)' },
  { value: 'coding', label: 'Coding (code generation, debugging)' },
  { value: 'rag', label: 'RAG (document Q&A, embeddings)' },
  { value: 'vision', label: 'Vision (image understanding)' },
  { value: 'embedding', label: 'Embedding (vector search)' },
  { value: 'summarization', label: 'Summarization (text summarization)' },
];

const GPU_OPTIONS = [
  { value: 'rtx-4090', label: 'NVIDIA RTX 4090', vram: 24 },
  { value: 'rtx-4080-super', label: 'NVIDIA RTX 4080 Super', vram: 16 },
  { value: 'rtx-4070-ti', label: 'NVIDIA RTX 4070 Ti', vram: 12 },
  { value: 'rtx-4060-ti', label: 'NVIDIA RTX 4060 Ti', vram: 16 },
  { value: 'rtx-3080', label: 'NVIDIA RTX 3080', vram: 10 },
  { value: 'rtx-3070', label: 'NVIDIA RTX 3070', vram: 8 },
  { value: 'rtx-3060', label: 'NVIDIA RTX 3060', vram: 12 },
  { value: 'a100', label: 'NVIDIA A100', vram: 40 },
  { value: 'a6000', label: 'NVIDIA RTX A6000', vram: 48 },
  { value: 'm4-max', label: 'Apple M4 Max', vram: 64 },
  { value: 'm3-ultra', label: 'Apple M3 Ultra', vram: 96 },
  { value: 'm3-max', label: 'Apple M3 Max', vram: 36 },
  { value: 'm2-ultra', label: 'Apple M2 Ultra', vram: 128 },
  { value: 'm1-ultra', label: 'Apple M1 Ultra', vram: 64 },
  { value: 'amd-rx-7900-xtx', label: 'AMD RX 7900 XTX', vram: 24 },
  { value: 'amd-rx-7800-xt', label: 'AMD RX 7800 XT', vram: 16 },
];

function HardwareForm({
  selectedGPU,
  selectedUseCase,
  speedQuality,
  contextWindow,
  onGPUChange,
  onUseCaseChange,
  onSpeedQualityChange,
  onContextWindowChange,
  onSubmit,
  isLoading
}: HardwareFormProps) {
  const speedQualityLabel = speedQuality === 1 ? 'Maximum Speed' :
                            speedQuality === 2 ? 'Fast' :
                            speedQuality === 3 ? 'Balanced' :
                            speedQuality === 4 ? 'Quality Focused' :
                            'Maximum Quality';

  return (
    <div className="form">
      <div className="form-group">
        <label htmlFor="gpu">Your GPU</label>
        <select 
          id="gpu" 
          value={selectedGPU} 
          onChange={(e) => onGPUChange(e.target.value)}
          className="select"
        >
          {GPU_OPTIONS.map(gpu => (
            <option key={gpu.value} value={gpu.value}>
              {gpu.label} ({gpu.vram}GB)
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="useCase">Primary Use Case</label>
        <select 
          id="useCase" 
          value={selectedUseCase} 
          onChange={(e) => onUseCaseChange(e.target.value as UseCase)}
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
          onChange={(e) => onSpeedQualityChange(parseInt(e.target.value))}
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
          onChange={(e) => onContextWindowChange(parseInt(e.target.value))}
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
        onClick={onSubmit}
        disabled={isLoading}
      >
        {isLoading ? 'Finding Models...' : 'Get Recommendations'}
      </button>
    </div>
  );
}

export default HardwareForm;
