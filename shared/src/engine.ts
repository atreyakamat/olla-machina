export type QuantLevel = 'Q4_K_M' | 'Q5_K_M' | 'Q8_0' | 'F16';
export type GPUType = 'nvidia' | 'amd' | 'intel' | 'metal' | 'cpu';
export type OS = 'Linux' | 'macOS' | 'Windows';
export type UseCase = 'chat' | 'coding' | 'rag' | 'vision' | 'embedding' | 'summarization';
export type QualityTier = 'efficient' | 'balanced' | 'best_quality';

export interface Model {
  id: string;
  name: string;
  variant: string;
  parameters: number;
  use_cases: string[];
  context_window: number;
  quant_levels: QuantLevel[];
  vram_requirements: Record<string, number>;
  storage_required_gb?: number;
  notable_strengths: string;
  ollama_pull_command: string;
  released: string;
  superseded_by?: string;
  huggingface_url?: string;
  benchmark_data?: BenchmarkData;
}

export interface BenchmarkData {
  [gpuModel: string]: {
    quant: QuantLevel;
    avg_tps: number;
    num_reports: number;
    median_latency_ms: number;
    date_range: string;
  };
}

export interface Benchmark {
  model_id: string;
  quant_level: QuantLevel;
  gpu_model: string;
  throughput_tps: number;
  latency_ms: number;
  temperature_c: number;
  num_reports: number;
}

export interface GPUSpec {
  type: GPUType;
  model: string;
  vram_gb: number;
  compute_capability?: string;
  metal_core_count?: number;
}

export interface CPUSpec {
  cores: number;
  architecture: 'x86_64' | 'arm64';
}

export interface HardwareSpec {
  gpu: GPUSpec;
  cpu: CPUSpec;
  system_ram_gb: number;
  storage_gb?: number;
  os: OS;
  unified_memory_gb?: number;
}

export interface UseCaseSpec {
  primary: UseCase;
  secondary?: string[];
  context_window_min?: number;
}

export interface UserPreferences {
  speed_vs_quality: number;
  max_vram_utilization: number;
  single_user: boolean;
}

export interface Fingerprint {
  fingerprint_id: string;
  created_at: string;
  hardware: HardwareSpec;
  use_case: UseCaseSpec;
  preferences: UserPreferences;
  source: 'web_form' | 'web_paste' | 'cli';
}

export interface Recommendation {
  model_id: string;
  model_name: string;
  variant: string;
  quantization: QuantLevel;
  vram_required_gb: number;
  vram_headroom_gb: number;
  estimated_tps: number | null;
  quality_tier: QualityTier;
  hybrid_mode: boolean;
  hybrid_ram_required_gb?: number;
  reason: string;
  ollama_command: string;
  huggingface_url: string;
  community_reports: number;
  confidence_score: number;
}

export interface RecommendationResult {
  fingerprint_id: string;
  generated_at: string;
  recommendations: Recommendation[];
  alternatives: Recommendation[];
  reasoning: {
    filtered_by_use_case: number;
    filtered_by_vram: number;
    final_candidates: number;
  };
}

export const QUANT_VRAM_BYTES_PER_PARAM: Record<QuantLevel, number> = {
  'Q4_K_M': 0.50,
  'Q5_K_M': 0.63,
  'Q8_0': 1.0,
  'F16': 2.0,
};

export const QUANT_QUALITY_SCORES: Record<QuantLevel, number> = {
  'Q4_K_M': 0.70,
  'Q5_K_M': 0.85,
  'Q8_0': 1.0,
  'F16': 1.0,
};

export const QUANT_LABELS: Record<QuantLevel, string> = {
  'Q4_K_M': 'Efficient',
  'Q5_K_M': 'Balanced',
  'Q8_0': 'Best Quality',
  'F16': 'Maximum',
};

export const REVERSE_QUANT_LABELS: Record<string, QuantLevel> = {
  'Efficient': 'Q4_K_M',
  'Balanced': 'Q5_K_M',
  'Best Quality': 'Q8_0',
  'Maximum': 'F16',
};

export const OLLAMA_OVERHEAD_PERCENT = 0.03;
export const MIN_VRAM_HEADROOM = 0.15;

export function computeVRAMRequired(
  parameters_billions: number,
  quant_level: QuantLevel
): number {
  const bytes_per_param = QUANT_VRAM_BYTES_PER_PARAM[quant_level];
  const base_bytes = parameters_billions * 1_000_000_000 * bytes_per_param;
  const with_overhead = base_bytes * (1 + OLLAMA_OVERHEAD_PERCENT);
  return with_overhead / (1024 ** 3);
}

export interface HybridModeSolution {
  fits_fully: boolean;
  vram_used_gb: number;
  system_ram_needed_gb: number;
  speed_penalty_percent: number;
  feasible: boolean;
  message: string;
}

export function analyzeHybridMode(
  model_params: number,
  quant_level: QuantLevel,
  vram_available_gb: number,
  system_ram_available_gb: number
): HybridModeSolution {
  const total_needed_gb = computeVRAMRequired(model_params, quant_level);

  if (total_needed_gb <= vram_available_gb) {
    return {
      fits_fully: true,
      vram_used_gb: total_needed_gb,
      system_ram_needed_gb: 0,
      speed_penalty_percent: 0,
      feasible: true,
      message: `Fits fully in VRAM (${total_needed_gb.toFixed(1)}GB / ${vram_available_gb.toFixed(1)}GB)`,
    };
  }

  const vram_deficit = total_needed_gb - vram_available_gb;
  const system_ram_needed = vram_deficit + (vram_deficit * 0.1);

  if (system_ram_needed > system_ram_available_gb) {
    return {
      fits_fully: false,
      vram_used_gb: vram_available_gb,
      system_ram_needed_gb: system_ram_needed,
      speed_penalty_percent: 0,
      feasible: false,
      message: `Insufficient RAM. Needs ${system_ram_needed.toFixed(1)}GB but only ${system_ram_available_gb.toFixed(1)}GB available.`,
    };
  }

  const layers_in_ram_percent = (vram_deficit / total_needed_gb) * 100;
  const speed_penalty = Math.min(layers_in_ram_percent * 0.2, 40);

  return {
    fits_fully: false,
    vram_used_gb: vram_available_gb,
    system_ram_needed_gb: system_ram_needed,
    speed_penalty_percent: speed_penalty,
    feasible: true,
    message: `Hybrid mode: ${vram_available_gb.toFixed(1)}GB VRAM + ${system_ram_needed.toFixed(1)}GB RAM. Speed ~${(100 - speed_penalty).toFixed(0)}% of full VRAM.`,
  };
}

export function getAppleSiliconMemoryPool(chip_identifier: string): number {
  const memory_map: Record<string, number> = {
    'M1': 8,
    'M1Pro': 16,
    'M1Max': 32,
    'M1Ultra': 64,
    'M2': 8,
    'M2Pro': 16,
    'M2Max': 32,
    'M2Ultra': 64,
    'M3': 8,
    'M3Pro': 18,
    'M3Max': 36,
    'M3Ultra': 72,
    'M4': 8,
    'M4Pro': 16,
    'M4Max': 36,
    'M4Ultra': 64,
  };

  for (const [chip, memory] of Object.entries(memory_map)) {
    if (chip_identifier.includes(chip)) {
      return memory;
    }
  }

  return 8;
}

export function getAvailableMemory(specs: HardwareSpec): number {
  if (specs.gpu.type === 'metal' && specs.unified_memory_gb) {
    return specs.unified_memory_gb;
  }
  if (specs.gpu.type === 'metal') {
    return specs.system_ram_gb * 0.8;
  }
  return specs.gpu.vram_gb;
}

interface ScoredCandidate {
  model: Model;
  quant: QuantLevel;
  vram_used: number;
  vram_headroom: number;
  estimated_tps: number | null;
  quality_tier: QualityTier;
  hybrid_mode: boolean;
  hybrid_ram_needed: number;
  composite_score: number;
  speed_penalty: number;
}

export function scoreRecommendations(
  fingerprint: Fingerprint,
  models: Model[],
  benchmarks: Benchmark[] = []
): RecommendationResult {
  const scored: ScoredCandidate[] = [];
  let filtered_by_use_case = 0;
  let filtered_by_vram = 0;

  const available_memory = getAvailableMemory(fingerprint.hardware);
  const available_storage = fingerprint.hardware.storage_gb || 1000;
  const quant_order: QuantLevel[] = ['Q4_K_M', 'Q5_K_M', 'Q8_0', 'F16'];

  for (const model of models) {
    const uses_match = model.use_cases.some(
      (u) => fingerprint.use_case.primary === u
    );

    if (!uses_match) {
      filtered_by_use_case++;
      continue;
    }

    const context_ok = model.context_window >= (fingerprint.use_case.context_window_min || 2048);
    if (!context_ok) {
      filtered_by_use_case++;
      continue;
    }

    if (model.storage_required_gb && model.storage_required_gb > available_storage) {
      filtered_by_vram++;
      continue;
    }

    let best_quant: QuantLevel | null = null;
    let best_vram_used = Infinity;

    for (const quant of quant_order) {
      const vram_needed = model.vram_requirements[quant];
      if (vram_needed && vram_needed <= available_memory) {
        best_quant = quant;
        best_vram_used = vram_needed;
        break;
      }
    }

    if (!best_quant) {
      const hybridResult = analyzeHybridMode(
        model.parameters,
        'Q4_K_M',
        available_memory,
        fingerprint.hardware.system_ram_gb
      );

      if (hybridResult.feasible) {
        best_quant = 'Q4_K_M';
        best_vram_used = hybridResult.vram_used_gb;
      } else {
        filtered_by_vram++;
        continue;
      }
    }

    const hybridSolution = analyzeHybridMode(
      model.parameters,
      best_quant,
      available_memory,
      fingerprint.hardware.system_ram_gb
    );

    const vram_pool = available_memory;
    const headroom = vram_pool - best_vram_used;
    const fit_ratio = headroom / vram_pool;
    const fit_score = fit_ratio > 0.10 ? 1.0 : fit_ratio / 0.10;

    const benchmark = benchmarks.find(
      (b) =>
        b.model_id === model.id &&
        b.quant_level === best_quant &&
        b.gpu_model.toLowerCase().includes(fingerprint.hardware.gpu.model.toLowerCase())
    );

    const speed_score = benchmark
      ? Math.min(benchmark.throughput_tps / 100, 1.0)
      : 0.5;

    const quality_score = QUANT_QUALITY_SCORES[best_quant];

    const days_old = (Date.now() - new Date(model.released).getTime()) / (1000 * 60 * 60 * 24);
    const recency_score = days_old < 30 ? 0.10 : 0;

    const priority_weight =
      fingerprint.preferences.speed_vs_quality === 1
        ? { speed: 0.4, quality: 0.1 }
        : fingerprint.preferences.speed_vs_quality === 5
        ? { speed: 0.1, quality: 0.4 }
        : { speed: 0.25, quality: 0.25 };

    const composite =
      (0.40 * fit_score) +
      (priority_weight.speed * speed_score) +
      (priority_weight.quality * quality_score) +
      (0.10 * recency_score);

    const quality_tier: QualityTier =
      quality_score < 0.75
        ? 'efficient'
        : quality_score < 0.95
        ? 'balanced'
        : 'best_quality';

    scored.push({
      model,
      quant: best_quant,
      vram_used: best_vram_used,
      vram_headroom: headroom,
      estimated_tps: benchmark?.throughput_tps || null,
      quality_tier,
      hybrid_mode: !hybridSolution.fits_fully,
      hybrid_ram_needed: hybridSolution.system_ram_needed_gb,
      composite_score: composite,
      speed_penalty: hybridSolution.speed_penalty_percent,
    });
  }

  const sorted = scored.sort((a, b) => b.composite_score - a.composite_score);

  const recommendations = sorted.slice(0, 1).map(formatRecommendation);
  const alternatives = sorted.slice(1, 5).map(formatRecommendation);

  return {
    fingerprint_id: fingerprint.fingerprint_id,
    generated_at: new Date().toISOString(),
    recommendations,
    alternatives,
    reasoning: {
      filtered_by_use_case,
      filtered_by_vram,
      final_candidates: scored.length,
    },
  };
}

function formatRecommendation(scored: ScoredCandidate): Recommendation {
  const model = scored.model;

  return {
    model_id: model.id,
    model_name: model.name,
    variant: model.variant,
    quantization: scored.quant,
    vram_required_gb: scored.vram_used,
    vram_headroom_gb: scored.vram_headroom,
    estimated_tps: scored.estimated_tps,
    quality_tier: scored.quality_tier,
    hybrid_mode: scored.hybrid_mode,
    hybrid_ram_required_gb: scored.hybrid_ram_needed > 0 ? scored.hybrid_ram_needed : undefined,
    reason: generateReason(model, scored),
    ollama_command: model.ollama_pull_command,
    huggingface_url: model.huggingface_url || `https://huggingface.co/${model.id}`,
    community_reports: 0,
    confidence_score: scored.composite_score,
  };
}

function generateReason(model: Model, scored: ScoredCandidate): string {
  const headroomGB = scored.vram_headroom.toFixed(1);
  const isCPU = scored.hybrid_mode || scored.model.variant.includes('cpu');

  if (scored.hybrid_mode) {
    if (scored.vram_used === 0 || scored.speed_penalty > 30) {
      return `CPU-Optimized: ${model.name}:${model.variant} running on System RAM. Expect slower inference (~2-5 tps) but high reliability.`;
    }
    return `${model.name}:${model.variant} at ${QUANT_LABELS[scored.quant]} quality. Hybrid mode enabled - ${scored.speed_penalty.toFixed(0)}% speed reduction using System RAM.`;
  }

  const memoryType = scored.vram_used > 0 ? 'GPU VRAM' : 'System RAM';
  return `${model.name}:${model.variant} at ${QUANT_LABELS[scored.quant]} quality. Best fit for ${headroomGB}GB headroom on your ${memoryType}.`;
}

export function generateFingerprintId(fingerprint: Omit<Fingerprint, 'fingerprint_id'>): string {
  const data = JSON.stringify({
    hardware: fingerprint.hardware,
    use_case: fingerprint.use_case,
    preferences: fingerprint.preferences,
  });

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return `fp_${Math.abs(hash).toString(16).padStart(12, '0')}`;
}

export function parseModelsFromYAML(data: any): Model[] {
  const models: Model[] = [];
  
  if (data.models) {
    for (const [category, modelList] of Object.entries(data.models)) {
      if (Array.isArray(modelList)) {
        for (const model of modelList) {
          models.push(model as Model);
        }
      }
    }
  } else if (Array.isArray(data)) {
    return data as Model[];
  }
  
  return models;
}
