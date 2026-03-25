export type QuantLevel = "Q4_K_M" | "Q5_K_M" | "Q8_0" | "F16";

export interface Model {
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
  supersedes?: string;
}

export interface HardwareSpecs {
  totalMemoryGB: number;
  vramGB: number;
  isAppleSilicon: boolean;
  cpuCores: number;
  os: string;
}

export interface UserPreferences {
  useCase: string;
  priority: "speed" | "quality" | "balanced";
}

export interface Recommendation {
  model: Model;
  quant: QuantLevel;
  label: string;
  score: number;
  vramUsage: number;
  isHybrid: boolean;
  reason: string;
}

export const QUANT_LABELS: Record<string, QuantLevel> = {
  "Efficient": "Q4_K_M",
  "Balanced": "Q5_K_M",
  "Best Quality": "Q8_0",
  "Maximum": "F16"
};

export const REVERSE_QUANT_LABELS: Record<QuantLevel, string> = {
  "Q4_K_M": "Efficient",
  "Q5_K_M": "Balanced",
  "Q8_0": "Best Quality",
  "F16": "Maximum"
};

export function getRecommendations(
  models: Model[],
  specs: HardwareSpecs,
  prefs: UserPreferences
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Available memory for models
  // On Apple Silicon, we use unified memory (usually ~75% available for GPU by default, but let's be conservative)
  const availableGPUMemory = specs.isAppleSilicon ? specs.totalMemoryGB * 0.8 : specs.vramGB;
  const availableSystemMemory = specs.totalMemoryGB;

  for (const model of models) {
    // Filter by use case if specified (loose matching)
    if (prefs.useCase !== "general" && !model.use_cases.includes(prefs.useCase)) {
      // Still consider if it's highly relevant or we can just score it lower
    }

    // Evaluate each quant level
    for (const quant of model.quant_levels) {
      const vramNeeded = model.vram_requirements[quant];
      if (!vramNeeded) continue;

      let score = 0;
      let isHybrid = false;
      let reason = "";

      if (vramNeeded <= availableGPUMemory) {
        // Fits in GPU
        score = 100 - (vramNeeded / availableGPUMemory) * 10; // Prefer smaller models if they fit better? Or larger?
        // Actually, prefer the highest quality that fits well.
        score += (quant === "Q8_0" ? 30 : quant === "Q5_K_M" ? 20 : 10);
        
        const headroom = (availableGPUMemory - vramNeeded).toFixed(1);
        reason = `Best your ${specs.isAppleSilicon ? "Unified Memory" : "GPU"} can handle with ${headroom} GB headroom.`;
      } else if (vramNeeded <= availableSystemMemory * 0.9) {
        // Fits in System RAM (Hybrid Mode)
        isHybrid = true;
        score = 50 - (vramNeeded / availableSystemMemory) * 20;
        reason = "Hybrid Mode - works with reduced inference speed.";
      } else {
        // Too big
        continue;
      }

      // Preference adjustments
      if (prefs.priority === "speed" && quant === "Q4_K_M") score += 20;
      if (prefs.priority === "quality" && quant === "Q8_0") score += 20;
      if (model.use_cases.includes(prefs.useCase)) score += 25;

      recommendations.push({
        model,
        quant,
        label: REVERSE_QUANT_LABELS[quant],
        score,
        vramUsage: vramNeeded,
        isHybrid,
        reason
      });
    }
  }

  // Sort by score and take top 5
  return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
}
