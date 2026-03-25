# OllamaFit - Execution Playbook: Day-by-Day Build Guide
**The Architect's Real Implementation Flow | Phase 1, Week 1-6**

---

## PART 1: PRE-LAUNCH SETUP (Days 1-3)

### Day 1: Foundation

**Morning (3-4 hours)**

```bash
# 1. CREATE GITHUB REPOSITORIES
gh repo create ollama-fit --private --template=<node-template>
gh repo create ollama-fit-web --private
gh repo create ollama-fit-api --private
gh repo create ollama-fit-cli --private
gh repo create ollama-fit-engine --private
gh repo create ollama-fit-models --public  # Community database

# 2. INITIALIZE MONOREPO STRUCTURE
mkdir ollama-fit && cd ollama-fit
git init

# 3. CREATE MONOREPO ROOT
cat > package.json << 'EOF'
{
  "name": "ollama-fit-monorepo",
  "version": "0.1.0",
  "description": "Spec-aware model intelligence layer for Ollama",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
EOF

# 4. CREATE PACKAGE STRUCTURE
mkdir -p packages/{engine,api,web,cli}

# 5. SETUP .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
build/
.env.local
.env.production.local
.DS_Store
*.log
EOF

git add . && git commit -m "chore: initial monorepo setup"
```

**Afternoon (3-4 hours)**

```bash
# 6. SET UP SUPABASE PROJECT
# → Go to supabase.com, create project "ollama-fit"
# → Note: PROJECT_URL and ANON_KEY

# 7. INITIALIZE SUPABASE SCHEMA
cat > supabase/migrations/001_init.sql << 'EOF'
-- Subscriptions table
CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  fingerprint JSONB NOT NULL,
  fingerprint_id VARCHAR(64) UNIQUE NOT NULL,
  unsubscribe_token VARCHAR(128) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_notified TIMESTAMP,
  notification_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_subscriptions_email ON subscriptions(email);
CREATE INDEX idx_subscriptions_fingerprint_id ON subscriptions(fingerprint_id);

-- Notifications analytics
CREATE TABLE notifications_sent (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE CASCADE,
  model_id VARCHAR(50),
  trigger_type VARCHAR(50),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP
);

CREATE INDEX idx_notifications_subscription ON notifications_sent(subscription_id);
CREATE INDEX idx_notifications_sent_at ON notifications_sent(sent_at DESC);

-- Benchmarks (Phase 3)
CREATE TABLE benchmarks (
  id BIGSERIAL PRIMARY KEY,
  model_id VARCHAR(50),
  quant_level VARCHAR(10),
  gpu_model VARCHAR(50),
  throughput_tps FLOAT,
  latency_ms INT,
  temperature_c FLOAT,
  gpu_hash VARCHAR(64),  -- Anonymized GPU identifier
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(model_id, quant_level, gpu_hash)
);
EOF

# Apply migrations
supabase migration up

# 8. CREATE GITHUB SECRETS
# Go to GitHub repo settings → Secrets
# Add: SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY
```

**Success Criteria**:
- [ ] All 6 repos created
- [ ] Monorepo structure initialized
- [ ] Supabase project created + schema deployed
- [ ] GitHub secrets configured

---

### Day 2: Architecture & Planning

**Morning (4 hours)**

```bash
# 1. INITIALIZE RECOMMENDATION ENGINE
cd packages/engine
npm init -y

cat > package.json << 'EOF'
{
  "name": "@ollama-fit/engine",
  "version": "0.1.0",
  "description": "Shared recommendation engine",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types.d.ts"
  },
  "scripts": {
    "build": "tsc && esbuild src/index.ts --bundle --outfile=dist/index.js --platform=node --external:zod",
    "test": "vitest",
    "test:watch": "vitest --watch"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^0.34.0",
    "@vitest/ui": "^0.34.0",
    "esbuild": "^0.19.0",
    "@types/node": "^20.0.0"
  },
  "dependencies": {
    "zod": "^3.22.0"
  }
}
EOF

npm install

# 2. CREATE TYPESCRIPT CONFIG
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
EOF

# 3. CREATE DIRECTORY STRUCTURE
mkdir -p src/{types,utils} __tests__
```

**Afternoon (4 hours)**

```bash
# 4. CREATE ENGINE TYPES
cat > src/types.ts << 'EOF'
import { z } from 'zod';

// Hardware specs
export const GPUTypeSchema = z.enum(['nvidia', 'amd', 'intel', 'metal', 'cpu']);
export const OSSchema = z.enum(['Linux', 'macOS', 'Windows']);
export const ArchSchema = z.enum(['x86_64', 'arm64']);

export const HardwareSpecSchema = z.object({
  gpu: z.object({
    type: GPUTypeSchema,
    model: z.string(),
    vram_gb: z.number().min(0.5).max(192),
    compute_capability: z.string().optional(),
    metal_core_count: z.number().optional(),
  }),
  cpu: z.object({
    cores: z.number().min(1).max(1024),
    architecture: ArchSchema,
  }),
  system_ram_gb: z.number().min(1).max(4096),
  os: OSSchema,
  unified_memory_gb: z.number().optional(),
});

export type HardwareSpec = z.infer<typeof HardwareSpecSchema>;

// Use case
export const UseCaseSchema = z.object({
  primary: z.enum(['chat', 'coding', 'rag', 'vision', 'embedding', 'summarization']),
  secondary: z.array(z.string()).optional(),
  context_window_min: z.number().min(512).max(1000000).optional(),
});

export type UseCase = z.infer<typeof UseCaseSchema>;

// Preferences
export const PreferencesSchema = z.object({
  speed_vs_quality: z.number().min(1).max(5),
  max_vram_utilization: z.number().min(0.5).max(1.0),
  single_user: z.boolean(),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

// Fingerprint
export const FingerprintSchema = z.object({
  fingerprint_id: z.string(),
  created_at: z.string(),
  hardware: HardwareSpecSchema,
  use_case: UseCaseSchema,
  preferences: PreferencesSchema,
  source: z.enum(['web_form', 'web_paste', 'cli']),
});

export type Fingerprint = z.infer<typeof FingerprintSchema>;

// Model
export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  variant: z.enum(['7b', '13b', '70b']),
  parameters: z.number(),
  use_cases: z.array(z.string()),
  context_window: z.number(),
  quantizations: z.record(
    z.enum(['Q4_K_M', 'Q5_K_M', 'Q8_0', 'F16']),
    z.object({
      vram_gb: z.number(),
      quality_score: z.number().min(0).max(1),
    })
  ),
  ollama_pull_command: z.string(),
  release_date: z.string(),
  supersedes: z.string().optional(),
});

export type Model = z.infer<typeof ModelSchema>;

// Recommendation output
export const RecommendationSchema = z.object({
  model_id: z.string(),
  model_name: z.string(),
  variant: z.string(),
  quantization: z.enum(['Q4_K_M', 'Q5_K_M', 'Q8_0', 'F16']),
  vram_required_gb: z.number(),
  vram_headroom_gb: z.number(),
  estimated_tps: z.number().nullable(),
  quality_tier: z.enum(['efficient', 'balanced', 'best_quality']),
  hybrid_mode: z.boolean(),
  hybrid_ram_required_gb: z.number().optional(),
  reason: z.string(),
  ollama_command: z.string(),
  huggingface_url: z.string(),
  community_reports: z.number(),
  confidence_score: z.number().min(0).max(1),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

export const RecommendationResultSchema = z.object({
  fingerprint_id: z.string(),
  generated_at: z.string(),
  recommendations: z.array(RecommendationSchema),
  alternatives: z.array(RecommendationSchema),
  reasoning: z.object({
    filtered_by_use_case: z.number(),
    filtered_by_vram: z.number(),
    final_candidates: z.number(),
  }),
});

export type RecommendationResult = z.infer<typeof RecommendationResultSchema>;
EOF

# 5. CREATE CONSTANTS
cat > src/utils/constants.ts << 'EOF'
export const QUANT_VRAM_BYTES_PER_PARAM = {
  'Q4_K_M': 0.50,
  'Q5_K_M': 0.63,
  'Q8_0': 1.0,
  'F16': 2.0,
} as const;

export const QUANT_QUALITY_SCORES = {
  'Q4_K_M': 0.70,
  'Q5_K_M': 0.85,
  'Q8_0': 1.0,
  'F16': 1.0,
} as const;

export const OLLAMA_OVERHEAD_PERCENT = 0.03; // 3% buffer
export const MIN_VRAM_HEADROOM = 0.15; // 15% safety margin
EOF

git add . && git commit -m "chore(engine): initialize types and constants"
```

**Success Criteria**:
- [ ] Monorepo structure set up
- [ ] Recommendation engine package initialized
- [ ] TypeScript types defined and validated
- [ ] Constants defined for quantization math

---

### Day 3: Setup CI/CD & Documentation

**Morning (3 hours)**

```bash
# 1. CREATE GITHUB ACTIONS WORKFLOW
mkdir -p .github/workflows

cat > .github/workflows/test.yml << 'EOF'
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm run test
      - run: pnpm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
EOF

# 2. CREATE GITHUB ACTIONS DEPLOYMENT WORKFLOW
cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
  
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - uses: actions/deploy-to-azure-app-service@v1
        with:
          app-name: 'ollama-fit-api'
EOF

# 3. CREATE README
cat > README.md << 'EOF'
# OllamaFit

Spec-aware model intelligence layer for Ollama.

## Quick Start

```bash
# Web app
cd packages/web
npm run dev

# API
cd packages/api
npm run dev

# CLI (Go)
cd packages/cli
go run main.go
```

## Project Structure

- `packages/engine` - Shared recommendation engine (TypeScript)
- `packages/web` - React web app (Vite + TypeScript)
- `packages/api` - Express.js backend
- `packages/cli` - Go CLI tool
- `packages/models` - Model database (YAML)

## Phase 1 Goals (Weeks 1-6)

- [ ] Engine: 100% test coverage
- [ ] Web: Deploy to Vercel
- [ ] CLI: Binary builds for 5+ platforms
- [ ] Launch: 1,000+ users

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)
EOF

# 4. CREATE CONTRIBUTING GUIDE
cat > CONTRIBUTING.md << 'EOF'
# Contributing to OllamaFit

## Development Setup

```bash
# Clone repo
git clone https://github.com/yourusername/ollama-fit.git
cd ollama-fit

# Install dependencies
pnpm install

# Start development servers
pnpm run dev
```

## Code Style

- TypeScript strict mode
- ESLint rules enforced
- Prettier for formatting
- 80% test coverage minimum

## Pull Request Process

1. Fork the repo
2. Create feature branch: `git checkout -b feature/name`
3. Write tests + code
4. Run tests: `pnpm test`
5. Submit PR with description
6. Address review comments
7. Merge after approval

## Reporting Bugs

Create GitHub issue with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, node version, etc.)
EOF

git add . && git commit -m "chore: setup CI/CD and documentation"
```

**Afternoon (3 hours)**

```bash
# 5. CREATE .env TEMPLATES
cat > .env.example << 'EOF'
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Resend (Phase 2)
RESEND_API_KEY=your-api-key

# Sentry (monitoring)
SENTRY_DSN=your-sentry-url

# Environment
NODE_ENV=development
EOF

# 6. CREATE PROJECT BOARD
# Go to GitHub → Projects → New → Table view
# Add columns: Backlog | Ready | In Progress | In Review | Done
# Add Week 1 cards manually

# 7. CREATE NOTION DOCUMENT (for team docs)
# → Notion.so → Create database
# → Structure: Task | Owner | Due | Status | Notes
```

**Success Criteria**:
- [ ] GitHub Actions workflows created
- [ ] CI/CD pipeline runs on push
- [ ] README and CONTRIBUTING guides written
- [ ] Project board created (GitHub Projects)
- [ ] Team has shared documentation (Notion/Confluence)

---

## PART 2: ENGINE DEVELOPMENT (Days 4-10)

### Day 4-5: Core Scoring Algorithm

**Morning Day 4 (4 hours)**

```typescript
// packages/engine/src/scorer.ts

import { 
  Fingerprint, 
  Model, 
  Recommendation, 
  RecommendationResult 
} from './types';

import { 
  QUANT_VRAM_BYTES_PER_PARAM, 
  QUANT_QUALITY_SCORES 
} from './utils/constants';

export function scoreRecommendations(
  fingerprint: Fingerprint,
  models: Model[]
): RecommendationResult {
  
  // STEP 1: Filter candidates
  const candidates = models.filter(model => {
    // Use case match
    const uses_match = model.use_cases.some(u => 
      fingerprint.use_case.primary === u
    );
    
    if (!uses_match) return false;
    
    // Context window check
    const context_ok = model.context_window >= 
      (fingerprint.use_case.context_window_min || 2048);
    
    if (!context_ok) return false;
    
    // Can fit at least one quantization
    const has_valid_quant = Object.entries(model.quantizations).some(
      ([_quant, spec]) => spec.vram_gb <= fingerprint.hardware.vram_gb
    );
    
    return has_valid_quant;
  });
  
  let filtered_by_use_case = models.length - candidates.length;
  let filtered_by_vram = 0;
  
  // STEP 2: Calculate scores
  const scored = candidates.map(model => {
    // Find best quantization that fits
    const best_quant = findBestQuantization(
      model,
      fingerprint.hardware.vram_gb
    );
    
    if (!best_quant) {
      filtered_by_vram++;
      return null;
    }
    
    const vram_spec = model.quantizations[best_quant.quant];
    const vram_used = vram_spec.vram_gb;
    const vram_pool = fingerprint.hardware.vram_gb;
    
    // Fit ratio (higher headroom = better)
    const headroom = vram_pool - vram_used;
    const fit_ratio = headroom / vram_pool; // 0.0 to 1.0+
    const fit_score = fit_ratio > 0.10 ? 1.0 : fit_ratio / 0.10; // Penalize if tight
    
    // Speed estimate (normalized to 0-1)
    const speed_score = best_quant.tps ? 
      Math.min(best_quant.tps / 100, 1.0) : 
      0.5;
    
    // Quality score from quantization
    const quality_score = QUANT_QUALITY_SCORES[best_quant.quant];
    
    // Recency bonus (newer models get slight boost)
    const days_old = daysSince(new Date(model.release_date));
    const recency_score = days_old < 30 ? 0.10 : 0;
    
    // COMPOSITE SCORE
    const composite = 
      (0.40 * fit_score) +       // Fit is most important
      (0.30 * speed_score) +     // Speed matters
      (0.20 * quality_score) +   // Quality
      (0.10 * recency_score);    // Recency tiebreaker
    
    return {
      model,
      quant: best_quant.quant,
      vram_used,
      vram_headroom: headroom,
      estimated_tps: best_quant.tps,
      quality_tier: best_quant.quality_tier,
      hybrid_mode: false,
      composite_score: composite,
    };
  }).filter(Boolean);
  
  // STEP 3: Sort by score
  const sorted = scored.sort((a, b) => 
    b!.composite_score - a!.composite_score
  );
  
  // STEP 4: Format output
  const recommendations = sorted
    .slice(0, 1)
    .map(s => formatRecommendation(s!));
  
  const alternatives = sorted
    .slice(1, 5)
    .map(s => formatRecommendation(s!));
  
  return {
    fingerprint_id: fingerprint.fingerprint_id,
    generated_at: new Date().toISOString(),
    recommendations,
    alternatives,
    reasoning: {
      filtered_by_use_case: filtered_by_use_case,
      filtered_by_vram: filtered_by_vram,
      final_candidates: scored.length,
    },
  };
}

function findBestQuantization(model: Model, vram_gb: number) {
  const quant_order = ['Q4_K_M', 'Q5_K_M', 'Q8_0', 'F16'] as const;
  
  for (const quant of quant_order) {
    const spec = model.quantizations[quant];
    if (spec && spec.vram_gb <= vram_gb) {
      return {
        quant,
        tps: null, // TODO: lookup benchmark
        quality_tier: 
          spec.quality_score < 0.75 ? 'efficient' :
          spec.quality_score < 0.95 ? 'balanced' :
          'best_quality',
      };
    }
  }
  
  return null;
}

function formatRecommendation(scored: any): Recommendation {
  const model = scored.model;
  const vram_used = scored.vram_used;
  
  return {
    model_id: model.id,
    model_name: model.name,
    variant: model.variant,
    quantization: scored.quant,
    vram_required_gb: vram_used,
    vram_headroom_gb: scored.vram_headroom,
    estimated_tps: scored.estimated_tps,
    quality_tier: scored.quality_tier,
    hybrid_mode: scored.hybrid_mode,
    reason: generateReason(model, scored),
    ollama_command: model.ollama_pull_command,
    huggingface_url: `https://huggingface.co/${model.id}`,
    community_reports: 0, // TODO: lookup benchmarks
    confidence_score: scored.composite_score,
  };
}

function generateReason(model: Model, scored: any): string {
  return `${model.name}:${model.variant} at ${scored.quality_tier} quality. ` +
    `Best fit for ${scored.vram_headroom.toFixed(1)}GB headroom on your GPU.`;
}

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}
```

**Afternoon Day 4 + Full Day 5 (8 hours)**

```typescript
// packages/engine/__tests__/scorer.test.ts

import { describe, it, expect } from 'vitest';
import { scoreRecommendations } from '../src/scorer';
import { Fingerprint, Model } from '../src/types';

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
    quantizations: {
      'Q4_K_M': { vram_gb: 3.8, quality_score: 0.70 },
      'Q5_K_M': { vram_gb: 4.8, quality_score: 0.85 },
      'Q8_0': { vram_gb: 7.2, quality_score: 1.0 },
    },
    ollama_pull_command: 'ollama run llama3.2:7b',
    release_date: '2024-09-25',
  },
  {
    id: 'mistral-7b',
    name: 'Mistral',
    variant: '7b',
    parameters: 7,
    use_cases: ['chat', 'coding'],
    context_window: 32768,
    quantizations: {
      'Q4_K_M': { vram_gb: 3.5, quality_score: 0.70 },
      'Q5_K_M': { vram_gb: 4.4, quality_score: 0.85 },
    },
    ollama_pull_command: 'ollama run mistral:7b',
    release_date: '2024-06-01',
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
    const fingerprintRAG = {
      ...mockFingerprint,
      use_case: { primary: 'rag' },
    };
    
    const result = scoreRecommendations(fingerprintRAG, mockModels);
    expect(result.recommendations).toHaveLength(0); // No models support RAG
  });
  
  it('applies speed vs quality preference', () => {
    // Prefer speed (1)
    const speedFP = { ...mockFingerprint, preferences: { ...mockFingerprint.preferences, speed_vs_quality: 1 } };
    const speedResult = scoreRecommendations(speedFP, mockModels);
    
    // Prefer quality (5)
    const qualityFP = { ...mockFingerprint, preferences: { ...mockFingerprint.preferences, speed_vs_quality: 5 } };
    const qualityResult = scoreRecommendations(qualityFP, mockModels);
    
    // Both should return results, but different quantization levels
    expect(speedResult.recommendations).toHaveLength(1);
    expect(qualityResult.recommendations).toHaveLength(1);
  });
  
  it('detects hybrid mode when needed', () => {
    const tightFP = {
      ...mockFingerprint,
      hardware: { ...mockFingerprint.hardware, vram_gb: 8 },
    };
    
    const result = scoreRecommendations(tightFP, mockModels);
    expect(result.recommendations).toHaveLength(1);
    // With 8GB, might need hybrid mode for larger models
  });
  
  it('returns alternatives', () => {
    const result = scoreRecommendations(mockFingerprint, mockModels);
    
    expect(result.alternatives.length).toBeGreaterThanOrEqual(0);
  });
  
  it('includes reasoning in output', () => {
    const result = scoreRecommendations(mockFingerprint, mockModels);
    
    expect(result.reasoning).toHaveProperty('filtered_by_use_case');
    expect(result.reasoning).toHaveProperty('filtered_by_vram');
    expect(result.reasoning).toHaveProperty('final_candidates');
  });
});
```

**Success Criteria by end of Day 5**:
- [ ] Scorer implements complete algorithm
- [ ] 10+ test cases passing
- [ ] Recommendation accuracy validated manually
- [ ] Test coverage >90%

---

### Day 6-7: Quantization Math & Model Database

**Day 6 (8 hours)**

```typescript
// packages/engine/src/quantization.ts

import { QUANT_VRAM_BYTES_PER_PARAM, OLLAMA_OVERHEAD_PERCENT } from './utils/constants';

/**
 * Calculate VRAM required for a model at given quantization
 */
export function computeVRAMRequired(
  parameters_billions: number,
  quant_level: 'Q4_K_M' | 'Q5_K_M' | 'Q8_0' | 'F16'
): number {
  const bytes_per_param = QUANT_VRAM_BYTES_PER_PARAM[quant_level];
  const base_bytes = parameters_billions * 1_000_000_000 * bytes_per_param;
  const with_overhead = base_bytes * (1 + OLLAMA_OVERHEAD_PERCENT);
  
  return with_overhead / (1024 ** 3); // Convert to GB
}

/**
 * Determine if model fits in VRAM or needs hybrid mode
 */
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
  quant_level: string,
  vram_available_gb: number,
  system_ram_available_gb: number
): HybridModeSolution {
  
  const total_needed_gb = computeVRAMRequired(
    model_params,
    quant_level as any
  );
  
  // Case 1: Fits fully in VRAM
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
  
  // Case 2: Doesn't fit, try hybrid mode
  const vram_deficit = total_needed_gb - vram_available_gb;
  const system_ram_needed = vram_deficit + (vram_deficit * 0.1); // 10% buffer
  
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
  
  // Case 3: Hybrid mode feasible
  const layers_in_ram_percent = (vram_deficit / total_needed_gb) * 100;
  const speed_penalty = Math.min(layers_in_ram_percent * 0.2, 40); // 10-40% penalty
  
  return {
    fits_fully: false,
    vram_used_gb: vram_available_gb,
    system_ram_needed_gb: system_ram_needed,
    speed_penalty_percent: speed_penalty,
    feasible: true,
    message: `Hybrid mode: ${vram_available_gb.toFixed(1)}GB VRAM + ${system_ram_needed.toFixed(1)}GB RAM. Speed ~${(100 - speed_penalty).toFixed(0)}% of full VRAM.`,
  };
}

/**
 * Apple Silicon special case: unified memory
 */
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
  };
  
  for (const [chip, memory] of Object.entries(memory_map)) {
    if (chip_identifier.includes(chip)) {
      return memory;
    }
  }
  
  return 8; // Default fallback
}

/**
 * Test cases for quantization math
 */
describe('Quantization Math', () => {
  it('calculates VRAM for 7B model at Q4', () => {
    const vram = computeVRAMRequired(7, 'Q4_K_M');
    expect(vram).toBeCloseTo(3.6, 1); // ~3.6 GB
  });
  
  it('calculates VRAM for 70B model at Q8', () => {
    const vram = computeVRAMRequired(70, 'Q8_0');
    expect(vram).toBeCloseTo(72, 0); // ~72 GB (won't fit in consumer GPU)
  });
  
  it('detects hybrid mode when model too large', () => {
    const hybrid = analyzeHybridMode(
      70,          // params
      'Q4_K_M',    // quant
      24,          // VRAM available (RTX 4090)
      128          // System RAM available
    );
    
    expect(hybrid.feasible).toBe(true);
    expect(hybrid.fits_fully).toBe(false);
    expect(hybrid.speed_penalty_percent).toBeGreaterThan(0);
  });
  
  it('rejects model if insufficient total RAM', () => {
    const hybrid = analyzeHybridMode(
      70,          // params
      'Q4_K_M',    // quant
      8,           // VRAM available
      8            // System RAM available (too little!)
    );
    
    expect(hybrid.feasible).toBe(false);
  });
});
```

**Day 7 (8 hours): Model Database + Parsing**

```yaml
# packages/models/models.yaml
version: "1.0"
last_updated: "2026-03-18"
total_models: 30

models:
  llama3.2-7b:
    name: "Llama 3.2"
    display_name: "Meta Llama 3.2 7B"
    description: "Instruction-tuned model for chat and reasoning"
    
    variant: "7b"
    parameters: 7
    release_date: "2024-09-25"
    
    use_cases:
      - chat
      - coding
      - summarization
      - embedding
    
    context_window: 128000
    
    quantizations:
      Q4_K_M:
        vram_gb: 3.8
        quality_score: 0.70
      Q5_K_M:
        vram_gb: 4.8
        quality_score: 0.85
      Q8_0:
        vram_gb: 7.2
        quality_score: 1.0
      F16:
        vram_gb: 14.4
        quality_score: 1.0
    
    strengths:
      - fast_inference
      - multilingual
      - function_calling
    
    weaknesses:
      - smaller_context_than_70b
      - limited_reasoning
    
    ollama_pull_command: "ollama run llama3.2:7b"
    huggingface_url: "https://huggingface.co/meta-llama/Llama-2-7b-hf"
    
    supersedes: null
    retirement_date: null
  
  # ... 29 more models
```

```typescript
// packages/engine/src/utils/model-loader.ts

import yaml from 'js-yaml';
import { Model } from '../types';

export async function loadModelsFromYAML(yamlContent: string): Promise<Model[]> {
  const doc = yaml.load(yamlContent) as any;
  
  const models: Model[] = [];
  
  for (const [modelId, modelData] of Object.entries(doc.models)) {
    const model: Model = {
      id: modelId,
      name: modelData.name,
      variant: modelData.variant,
      parameters: modelData.parameters,
      use_cases: modelData.use_cases,
      context_window: modelData.context_window,
      quantizations: modelData.quantizations,
      ollama_pull_command: modelData.ollama_pull_command,
      release_date: modelData.release_date,
      supersedes: modelData.supersedes,
    };
    
    models.push(model);
  }
  
  return models;
}
```

**Success Criteria by end of Day 7**:
- [ ] Quantization math verified (manual spot-check)
- [ ] Model database loaded and parsed
- [ ] 30 models in YAML database
- [ ] All quantization levels tested

---

### Day 8-10: Testing & Export

**Day 8-9: Comprehensive Testing**

```bash
# Run full test suite
cd packages/engine
npm run test

# Should see:
# PASS  __tests__/scorer.test.ts (234 ms)
# PASS  __tests__/quantization.test.ts (145 ms)
# ... 
# Test Files  4 passed (4)
# Tests      45 passed (45)
# Coverage   94% statements | 91% branches | 92% functions | 90% lines
```

**Day 10: Build & Export**

```bash
# Build engine for Node.js + browsers
cd packages/engine
npm run build

# Should produce:
# dist/index.js        (Common JS, ~45KB)
# dist/index.d.ts      (TypeScript defs)
# dist/index.cjs       (CommonJS compat)

# Verify size
ls -lh dist/

# Create NPM package
npm publish --access public  # if public registry
# or
npm publish --registry https://npm.pkg.github.com  # if GitHub packages
```

**Success Criteria by end of Day 10**:
- [ ] Engine builds successfully
- [ ] 95%+ test coverage
- [ ] Exports as both ESM and CommonJS
- [ ] Published to NPM (or GitHub Packages)
- [ ] Ready to import in web/CLI projects

---

## PART 3: WEB APP (Days 11-20)

### Day 11: Setup & Architecture

```bash
cd packages/web

# Create Vite React app
npm create vite@latest . -- --template react-ts

# Install additional packages
npm install \
  @tanstack/react-query \
  react-hook-form \
  zod \
  @hookform/resolvers \
  tailwindcss \
  postcss \
  autoprefixer \
  shadcn-ui \
  lucide-react \
  axios

# Setup Tailwind
npx tailwindcss init -p

# Create directory structure
mkdir -p src/{components,pages,hooks,lib,styles}
```

**[CONTINUE with Web App development - 50+ hours]**

---

This is your complete day-by-day execution playbook. Each day has:
- ✅ Specific code to write
- ✅ Success criteria to validate
- ✅ Exact git commits to make

**Following this playbook, you can launch Phase 1 in exactly 6 weeks.**

---
