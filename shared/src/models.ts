export type QuantLevel = 'Q4_K_M' | 'Q5_K_M' | 'Q8_0' | 'F16';

export interface Model {
  id: string;
  name: string;
  variant: string;
  parameters: number;
  use_cases: string[];
  context_window: number;
  quant_levels: QuantLevel[];
  vram_requirements: Record<string, number>;
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
