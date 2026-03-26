import { describe, it, expect } from 'vitest';
import { scoreRecommendations } from '../src/engine';
import type { Fingerprint, Model } from '../src/engine';

const mockFingerprint: Fingerprint = {
  fingerprint_id: 'test-123',
  created_at: new Date().toISOString(),
  hardware: {
    gpu: {
      type: 'nvidia',
      model: 'RTX4090',
      vram_gb: 24,
    },
    cpu: {
      cores: 16,
      architecture: 'x86_64',
    },
    system_ram_gb: 128,
    os: 'Linux',
  },
  use_case: {
    primary: 'chat',
    context_window_min: 4096,
  },
  preferences: {
    speed_vs_quality: 3,
    max_vram_utilization: 0.85,
    single_user: true,
  },
  source: 'web_form',
};

const mockModels: Model[] = [
  {
    id: 'llama3.2-7b',
    name: 'Llama 3.2',
    variant: '7b',
    parameters: 7,
    use_cases: ['chat', 'coding'],
    context_window: 128000,
    quant_levels: ['Q4_K_M', 'Q5_K_M', 'Q8_0'],
    vram_requirements: {
      'Q4_K_M': 3.8,
      'Q5_K_M': 4.8,
      'Q8_0': 7.2,
    },
    ollama_pull_command: 'ollama run llama3.2:7b',
    released: '2024-09-25',
    notable_strengths: 'Fast, compact',
  },
  {
    id: 'mistral-7b',
    name: 'Mistral',
    variant: '7b',
    parameters: 7,
    use_cases: ['chat', 'coding'],
    context_window: 32768,
    quant_levels: ['Q4_K_M', 'Q5_K_M'],
    vram_requirements: {
      'Q4_K_M': 3.5,
      'Q5_K_M': 4.4,
    },
    ollama_pull_command: 'ollama run mistral:7b',
    released: '2024-06-01',
    notable_strengths: 'Efficient',
  },
];

describe('scoreRecommendations', () => {
  it('returns top model that fits VRAM', () => {
    const result = scoreRecommendations(mockFingerprint, mockModels);
    
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]).toBeDefined();
    expect(result.recommendations[0].vram_required_gb).toBeLessThanOrEqual(24);
  });
  
  it('filters by use case', () => {
    const fingerprintRAG: Fingerprint = {
      ...mockFingerprint,
      use_case: { primary: 'rag' },
    };
    
    const result = scoreRecommendations(fingerprintRAG, mockModels);
    expect(result.recommendations).toHaveLength(0); // No models support RAG in mock
  });
  
  it('applies speed vs quality preference', () => {
    const speedFP: Fingerprint = { 
        ...mockFingerprint, 
        preferences: { ...mockFingerprint.preferences, speed_vs_quality: 1 } 
    };
    const speedResult = scoreRecommendations(speedFP, mockModels);
    
    const qualityFP: Fingerprint = { 
        ...mockFingerprint, 
        preferences: { ...mockFingerprint.preferences, speed_vs_quality: 5 } 
    };
    const qualityResult = scoreRecommendations(qualityFP, mockModels);
    
    expect(speedResult.recommendations).toHaveLength(1);
    expect(qualityResult.recommendations).toHaveLength(1);
  });
  
  it('detects hybrid mode when needed', () => {
    const tightFP: Fingerprint = {
      ...mockFingerprint,
      hardware: { 
        ...mockFingerprint.hardware, 
        gpu: { ...mockFingerprint.hardware.gpu, vram_gb: 2 } 
      },
    };
    
    const result = scoreRecommendations(tightFP, mockModels);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].hybrid_mode).toBe(true);
  });
  
  it('includes reasoning in output', () => {
    const result = scoreRecommendations(mockFingerprint, mockModels);
    
    expect(result.reasoning).toHaveProperty('filtered_by_use_case');
    expect(result.reasoning).toHaveProperty('filtered_by_vram');
    expect(result.reasoning).toHaveProperty('final_candidates');
  });
});
