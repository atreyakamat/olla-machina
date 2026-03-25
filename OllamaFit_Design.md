# OllamaFit - System Design & Architecture Document
**Version 2.0 | March 2026 | Confidential**

---

## Part 1: System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                     │
├─────────────────────────┬──────────────────────────────────┤
│    WEB APP (React)      │      CLI TOOL (Go Binary)        │
│  • Form submission      │  • Auto-detect hardware          │
│  • Paste mode           │  • Interactive prompts           │
│  • Visual output        │  • Terminal rendering            │
│  • Email signup         │  • JSON output mode              │
└──────────┬──────────────┴──────────────────┬───────────────┘
           │                                  │
           └──────────────┬───────────────────┘
                          │ (API/Module)
           ┌──────────────▼──────────────────┐
           │  SHARED RECOMMENDATION ENGINE   │
           │  • Scoring algorithm            │
           │  • Quantization math            │
           │  • Hardware compatibility check │
           │  • Ranking logic                │
           │  • Spec fingerprint generation  │
           └──────┬───────────────┬──────────┘
                  │               │
        ┌─────────▼───┐   ┌──────▼───────────┐
        │  Model DB   │   │   Benchmarks     │
        │  (YAML)     │   │   (Community)    │
        │  GitHub     │   │   Supabase       │
        └─────────────┘   └──────────────────┘
                  │
        ┌─────────▼──────────────────┐
        │   NOTIFICATION SYSTEM      │
        │  • Email subscriptions     │
        │  • Fingerprint storage     │
        │  • Cron-based triggers     │
        │  • Resend/Postmark API     │
        │  • Supabase/PlanetScale    │
        └────────────────────────────┘
```

### Data Flow: Web App

```
User Visit (ollamafit.app)
    ↓
[PASTE MODE]                    [MANUAL MODE]
Paste JSON from                 Select hardware
ollama info                      & preferences
    ↓                                  ↓
Parse GPU/CPU/OS         ←────────────┘
    ↓
Generate Spec Fingerprint (JSON)
    ↓
Call Recommendation Engine
    ├─ Input: Fingerprint + Model DB
    ├─ Process: Scoring algorithm
    └─ Output: Ranked recommendations
    ↓
Render Output Cards
├─ Hero (best fit)
├─ Reasoning
├─ Alternatives
└─ Email opt-in
    ↓
User actions:
├─ Copy ollama run command → Terminal
├─ View alternatives
├─ Subscribe to alerts → Fingerprint stored in DB
└─ Leave
```

### Data Flow: CLI Tool

```
$ ollama-fit
    ↓
Auto-detect hardware
├─ nvidia-smi / metal / rocm
├─ OS detection
├─ Ollama version check
└─ CPU core count
    ↓
Interactive prompts
├─ Use case (5 options)
└─ Speed/quality slider
    ↓
Generate Spec Fingerprint
    ↓
Call Recommendation Engine (local or remote)
    ↓
Format output
├─ Human: Terminal rendering
└─ JSON: Structured output
    ↓
Display recommendations
    ↓
Prompt: Subscribe?
$ ollama-fit --subscribe email@example.com
    ↓
Store fingerprint + email in DB
Show confirmation
```

### Data Flow: Notification System

```
[Weekly Cron Job]
    ↓
Load model database (GitHub YAML)
Load all subscriptions (Supabase)
    ↓
FOR each subscriber:
    └─ FOR each new/updated model:
        ├─ Does model match use case? YES/NO
        ├─ Does it fit VRAM? YES/NO
        ├─ Is it better than alternatives? YES/NO
        └─ Should notify? YES → Queue email
    ↓
Batch send via Resend/Postmark
    ↓
Log delivery + open rates
    ↓
Update fingerprint `last_notified`
```

---

## Part 2: Core Modules Deep Dive

### Module 1: Recommendation Engine

**Language**: TypeScript (isomorphic JavaScript)
**Export**: Both CommonJS + ES Modules
**Use**: Web (npm), CLI (Node.js wrapper or WASM)

#### File Structure
```
src/engine/
├─ index.ts              # Main export
├─ scorer.ts             # Scoring algorithm
├─ quantization.ts       # VRAM math + quant selection
├─ fingerprinter.ts      # Spec → JSON fingerprint
├─ types.ts              # TypeScript interfaces
├─ utils/
│  ├─ vram-calculator.ts
│  ├─ quant-mapper.ts
│  └─ use-case-matcher.ts
└─ __tests__/
   ├─ scorer.test.ts
   ├─ quantization.test.ts
   └─ integration.test.ts
```

#### Core Types

```typescript
// Input: Hardware specs
interface HardwareSpec {
  gpu: {
    type: 'nvidia' | 'amd' | 'intel' | 'metal' | 'cpu';
    model: string;
    vram_gb: number;
    compute_capability?: string; // NVIDIA only
    metal_core_count?: number;   // Apple Metal
  };
  cpu: {
    cores: number;
    architecture: 'x86_64' | 'arm64';
  };
  system_ram_gb: number;
  os: 'Linux' | 'macOS' | 'Windows';
  unified_memory?: number; // Apple Silicon
}

// Input: Use case preferences
interface UseCase {
  primary: 'chat' | 'coding' | 'rag' | 'vision' | 'embedding' | 'summarization';
  secondary?: string[];
  context_window_min?: number;
}

// Input: User preferences
interface Preferences {
  speed_vs_quality: 1 | 2 | 3 | 4 | 5; // 1=speed, 5=quality
  max_vram_utilization: 0.7 | 0.8 | 0.85 | 0.9; // Safety margin
  single_user: boolean;
}

// Output: Single recommendation
interface Recommendation {
  model_id: string;
  model_name: string;
  variant: string; // "7b", "13b", "70b"
  quantization: 'Q4_K_M' | 'Q5_K_M' | 'Q8_0' | 'F16';
  vram_required_gb: number;
  vram_headroom_gb: number;
  estimated_tps: number | null; // From community benchmarks or null
  quality_tier: 'efficient' | 'balanced' | 'best_quality';
  hybrid_mode: boolean;
  hybrid_ram_required_gb?: number;
  reason: string; // "Best chat model for 8GB VRAM"
  ollama_command: string; // "ollama run llama3.2:7b"
  huggingface_url: string;
  community_reports: number; // How many users submitted benchmarks
  confidence_score: number; // 0.0 to 1.0
}

// Output: Ranked list
interface RecommendationResult {
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
```

#### Scoring Algorithm (Pseudo-code)

```typescript
function scoreRecommendations(
  fingerprint: Fingerprint,
  models: ModelDB,
  benchmarks: BenchmarkDB
): Recommendation[] {
  
  // STEP 1: Filter
  let candidates = models.filter(m => {
    const uses_match = m.use_cases.some(u => 
      fingerprint.use_case.primary === u
    );
    const context_ok = m.context_window >= 
      (fingerprint.use_case.context_window_min || 2048);
    
    // Find best quant that fits
    const best_quant = findBestQuant(m, fingerprint.hardware);
    const vram_ok = best_quant !== null;
    
    return uses_match && context_ok && vram_ok;
  });
  
  // STEP 2: Calculate metrics
  const scored = candidates.map(model => {
    const quant = findBestQuant(model, fingerprint.hardware);
    const vram_used = calculateVRAM(model.parameters, quant);
    const vram_pool = fingerprint.hardware.vram_gb;
    
    // Fit ratio: how well does it fit?
    const fit_ratio = 1 - (vram_used / vram_pool);
    const fit_score = fit_ratio > 0.85 ? 0 : fit_ratio; // Penalty if too tight
    
    // Speed estimate
    const benchmark = lookupBenchmark(
      model.id,
      quant,
      fingerprint.hardware.gpu.model
    );
    const speed_score = benchmark ? 
      (benchmark.tps / 100) : // Normalize
      estimateSpeedFromSpec(model.parameters, quant);
    
    // Quality score
    const quality_score = {
      'Q4_K_M': 0.70,
      'Q5_K_M': 0.85,
      'Q8_0': 1.0,
      'F16': 1.0
    }[quant];
    
    // Recency bonus
    const days_since_release = daysSince(model.release_date);
    const recency_score = days_since_release < 30 ? 0.05 : 0;
    
    // FINAL SCORE
    const composite_score = 
      (0.4 * fit_score) +
      (0.3 * speed_score) +
      (0.2 * quality_score) +
      (0.1 * recency_score);
    
    return {
      model,
      quant,
      vram_used,
      score: composite_score,
      details: { fit_score, speed_score, quality_score }
    };
  });
  
  // STEP 3: Rank & return top 5
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => formatRecommendation(s));
}
```

#### Key Functions

**`findBestQuant(model, hardware)`**: 
- Iterates through quant levels (Q4 → Q5 → Q8 → F16)
- Stops at first quant that fits VRAM
- Returns quant code or null if none fit
- Special case: Apple unified memory (all VRAM available)

**`calculateVRAM(params_billions, quant_level)`**:
- Formula: `params × bytes_per_param`
- Lookup table for bytes_per_param by quant
- Add 2-3% overhead for Ollama runtime

**`estimateSpeedFromSpec(params, quant, gpu_model)`**:
- Fallback when no community benchmark exists
- Uses rough heuristic: `(gpu_tflops × 0.3) / (params × bytes_per_param)`
- Marked as estimate in output

**`lookupBenchmark(model_id, quant, gpu_model)`**:
- Query benchmark database
- Match GPU closely (RTX 4090 vs 4080 vs 3090)
- Return median tps from last 10 submissions

---

### Module 2: Quantization Engine

**Purpose**: Translate VRAM constraints into user-friendly quality choices

#### VRAM Reference Table (Computed, Not Hardcoded)

```typescript
const QUANT_VRAM_BYTES_PER_PARAM = {
  'Q4_K_M': 0.50,    // 4-bit + key-value cache
  'Q5_K_M': 0.63,    // 5-bit variant
  'Q8_0': 1.0,       // 8-bit quantization
  'F16': 2.0,        // Full 16-bit float
};

function computeVRAMRequired(
  parameters_billions: number,
  quant_level: string,
  ollama_overhead_percent: number = 0.03
): number {
  const base = parameters_billions * 1e9 * QUANT_VRAM_BYTES_PER_PARAM[quant_level];
  const with_overhead = base * (1 + ollama_overhead_percent);
  return with_overhead / (1024 ** 3); // Convert to GB
}

// Examples:
computeVRAM(7, 'Q4_K_M') → 3.6 GB
computeVRAM(7, 'Q5_K_M') → 4.5 GB
computeVRAM(70, 'Q4_K_M') → 36 GB
computeVRAM(70, 'Q5_K_M') → 45 GB
```

#### Apple Silicon Special Handling

```typescript
function getAppleSiliconMemoryPool(chip_identifier: string): number {
  // sysctl -n hw.model → "Mac14,10"
  const chip_memory = {
    'M1': 8,
    'M1Pro': 16,
    'M1Max': 32,
    'M2': 8,
    'M2Pro': 16,
    'M2Max': 32,
    'M3': 8,
    'M3Pro': 18,
    'M3Max': 36,
  };
  
  return chip_memory[parseChip(chip_identifier)] || 8; // Default 8GB
}

// Implication: All memory available to model (no VRAM vs RAM split)
// → More aggressive quant selection
// → UI shows "Unified Memory: 18GB" (never "VRAM")
```

#### Hybrid Mode Calculation

```typescript
interface HybridModeSolution {
  model_id: string;
  quant: string;
  vram_used_gb: number;
  system_ram_needed_gb: number;
  total_required_gb: number;
  feasible: boolean;
  speed_penalty_percent: number; // Typically 10-30%
  warning: string;
}

function tryHybridMode(
  model_params: number,
  quant: string,
  vram_available: number,
  system_ram_available: number
): HybridModeSolution {
  
  const total_model_vram = computeVRAM(model_params, quant);
  const vram_deficit = total_model_vram - vram_available;
  
  if (vram_deficit <= 0) {
    return { feasible: true, speed_penalty: 0 }; // Fits fully in VRAM
  }
  
  // Ollama offloads overflow to system RAM
  const system_ram_needed = vram_deficit + (vram_deficit * 0.1); // 10% buffer
  
  if (system_ram_needed > system_ram_available) {
    return { feasible: false, reason: `Needs ${system_ram_needed}GB but only ${system_ram_available}GB available` };
  }
  
  // Estimate speed penalty: 10-20% for VRAM→RAM boundary
  const layers_in_ram_percent = (vram_deficit / total_model_vram) * 100;
  const speed_penalty = Math.min(layers_in_ram_percent * 0.2, 40); // Cap at 40%
  
  return {
    feasible: true,
    vram_used_gb: vram_available,
    system_ram_needed_gb: system_ram_needed,
    speed_penalty_percent: speed_penalty,
    warning: `Hybrid mode enabled. Speed reduced by ~${speed_penalty}% due to RAM offload.`
  };
}
```

---

### Module 3: Spec Fingerprinter

**Purpose**: Convert hardware + preferences → unique fingerprint (JSON)

#### Generation Paths

**Path A: Web Form**
```typescript
function generateFingerprintFromForm(
  formData: FormInput
): Fingerprint {
  
  const gpu = parseGPUSelect(formData.gpu_dropdown);
  const vram = parseFloat(formData.vram_input);
  const use_case = formData.use_case_select;
  // ... more fields
  
  return {
    id: hash(JSON.stringify(input)),
    hardware: { gpu, vram, ... },
    use_case,
    preferences,
    timestamp,
  };
}
```

**Path B: Web Paste Mode**
```typescript
function generateFingerprintFromJSON(
  ollamaInfo: string // JSON from ollama info
): Fingerprint {
  
  const parsed = JSON.parse(ollamaInfo);
  
  // Extract GPU model, VRAM from Ollama's response
  const gpu = detectGPUFromOllamaInfo(parsed);
  // System RAM from parsed.system_memory
  // OS from parsed.os
  
  return createFingerprint({ gpu, system_ram, os, ... });
}
```

**Path C: CLI Auto-detect**
```typescript
async function generateFingerprintFromCLI(
  interactive: boolean = true
): Promise<Fingerprint> {
  
  // Auto-detect hardware
  const gpu = await detectGPU(); // nvidia-smi / metal / rocm
  const cpu_cores = await detectCPU();
  const system_ram = await detectSystemRAM();
  const os = detectOS();
  
  if (interactive) {
    // Ask user for use case + preferences
    const use_case = await promptUseCase();
    const speed_quality = await promptSpeedQuality();
  }
  
  return createFingerprint({
    hardware: { gpu, cpu_cores, system_ram, os },
    use_case,
    preferences
  });
}
```

#### Fingerprint Schema

```json
{
  "fingerprint_id": "sha256_abcd1234...",
  "created_at": "2026-03-18T11:49:00Z",
  "hardware": {
    "gpu": {
      "type": "nvidia",
      "model": "RTX4090",
      "vram_gb": 24,
      "compute_capability": "8.9"
    },
    "cpu": {
      "cores": 32,
      "architecture": "x86_64"
    },
    "system_ram_gb": 128,
    "os": "Linux",
    "unified_memory_gb": null
  },
  "use_case": {
    "primary": "chat",
    "secondary": ["coding"],
    "context_window_min": 8000
  },
  "preferences": {
    "speed_vs_quality": 3,
    "max_vram_utilization": 0.85,
    "single_user": true
  },
  "source": "web_form" | "web_paste" | "cli"
}
```

---

### Module 4: Model Database Parser

**Location**: Public GitHub repo (community-maintained)
**Format**: YAML (human-readable, git-friendly diffs)
**Update Frequency**: Weekly (automated sync from Ollama registry)

#### YAML Schema

```yaml
version: "1.0"
last_updated: 2026-03-18
total_models: 42

models:
  llama3.2-7b:
    name: Llama 3.2
    display_name: Meta Llama 3.2
    description: "Instruction-tuned model for chat"
    
    variants:
      7b:
        parameters: 7
        release_date: 2024-09-25
        
        # Use cases this model excels at
        use_cases:
          - chat
          - coding
          - embedding
        
        # Context window capacity
        context_window: 128000
        
        # Quantization levels available + VRAM requirements
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
        
        # Human-readable strengths/weaknesses
        strengths:
          - fast_inference
          - multilingual
          - function_calling
          - good_coding_ability
        
        weaknesses:
          - limited_reasoning_tasks
          - sensitive_to_prompt_format
        
        # Official Ollama command
        ollama_pull_command: "ollama run llama3.2:7b"
        
        # HuggingFace link for detailed info
        huggingface_url: "https://huggingface.co/meta-llama/Llama-2-7b-hf"
        
        # Community benchmark data (aggregate)
        benchmarks:
          nvidia_rtx_4090:
            - quant: Q5_K_M
              avg_tps: 98
              num_reports: 12
              median_latency_ms: 102
              date_range: "2026-03-01 to 2026-03-18"
          
          nvidia_rtx_3080:
            - quant: Q4_K_M
              avg_tps: 45
              num_reports: 8
              median_latency_ms: 220
              date_range: "2026-02-15 to 2026-03-15"
          
          apple_m3_max:
            - quant: Q5_K_M
              avg_tps: 65
              num_reports: 4
              unified_memory_gb: 36
              date_range: "2026-03-10 to 2026-03-18"
        
        # If a newer/better model exists, mark it here
        # Users running this model get notified
        supersedes: null  # or "mistral:7b" if applicable
        retirement_date: null  # or "2026-06-01" if deprecated
      
      13b:
        parameters: 13
        # ... same schema
      
      70b:
        parameters: 70
        # ... same schema
  
  mistral-7b:
    # ... similar structure
```

#### GitHub Workflow

```
1. Community submits PR with new model
   Format: Well-formed YAML, follows schema
   Includes: Model ID, quant levels, HF link

2. Automated validation
   - YAML syntax check
   - Schema validation
   - Model exists on HF or Ollama registry

3. Human review (maintainer)
   - Verify model quality
   - Check quantization specs accuracy
   - Look for spam/duplicates

4. Auto-merge on approval

5. Webhook triggers sync
   - Pull new YAML from GitHub
   - Rebuild in-memory DB
   - Notify subscribers if new model matches their spec
```

---

## Part 3: Web App Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build**: Vite
- **CSS**: Tailwind + custom components
- **HTTP**: SWR or React Query for data fetching
- **Deployment**: Vercel (serverless functions + CDN)

### Directory Structure
```
web/
├─ public/
│  ├─ favicon.svg
│  ├─ ollama-logo.svg
│  └─ og-image.png
├─ src/
│  ├─ components/
│  │  ├─ InputForm.tsx
│  │  ├─ PasteMode.tsx
│  │  ├─ RecommendationCard.tsx
│  │  ├─ RecommendationList.tsx
│  │  ├─ EmailSignup.tsx
│  │  └─ QuantizationExplainer.tsx
│  ├─ pages/
│  │  ├─ index.tsx          # Landing
│  │  ├─ recommender.tsx    # Main app
│  │  ├─ docs.tsx           # How it works
│  │  └─ unsubscribe.tsx    # Email link
│  ├─ hooks/
│  │  ├─ useRecommendation.ts
│  │  └─ useFingerprint.ts
│  ├─ api/
│  │  ├─ recommend.ts       # API endpoint
│  │  ├─ subscribe.ts       # Email signup
│  │  └─ unsubscribe.ts     # Email removal
│  ├─ lib/
│  │  ├─ engine.ts          # Recommendation engine (imported)
│  │  ├─ types.ts
│  │  └─ utils.ts
│  ├─ styles/
│  │  ├─ globals.css
│  │  └─ components.css
│  └─ App.tsx
├─ package.json
├─ tsconfig.json
├─ tailwind.config.js
└─ vite.config.ts
```

### Key Components

#### RecommendationCard.tsx
```typescript
interface Props {
  recommendation: Recommendation;
  rank: number;
  isHero?: boolean;
}

export function RecommendationCard({ 
  recommendation, 
  rank, 
  isHero = false 
}: Props) {
  return (
    <div className={isHero ? 'card-hero' : 'card-secondary'}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <h3>{recommendation.model_name} ({recommendation.variant})</h3>
        {isHero && <span className="badge">Best fit</span>}
      </div>
      
      {/* Quantization visual */}
      <div className="quant-selector">
        <span className="quant-label">{recommendation.quality_tier}</span>
        <span className="vram-needed">{recommendation.vram_required_gb}GB</span>
      </div>
      
      {/* Reasoning */}
      <p className="reasoning">{recommendation.reason}</p>
      
      {/* Benchmarks (if available) */}
      {recommendation.estimated_tps && (
        <div className="benchmark">
          <span>~{recommendation.estimated_tps} tok/s</span>
          <span>({recommendation.community_reports} reports)</span>
        </div>
      )}
      
      {/* Hybrid mode warning */}
      {recommendation.hybrid_mode && (
        <div className="warning">
          ⚠️ Hybrid Mode: Needs {recommendation.hybrid_ram_required_gb}GB system RAM
        </div>
      )}
      
      {/* Copy command */}
      <CopyButton command={recommendation.ollama_command} />
      
      {/* Links */}
      <div className="links">
        <a href={recommendation.huggingface_url}>View on HF →</a>
      </div>
    </div>
  );
}
```

#### EmailSignupForm.tsx
```typescript
interface Props {
  fingerprint: Fingerprint;
}

export function EmailSignupForm({ fingerprint }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fingerprint
        })
      });
      
      if (response.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="email-signup">
      <h4>Get alerts when better models appear</h4>
      <div className="input-group">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Subscribing...' : 'Subscribe'}
        </button>
      </div>
      
      {status === 'success' && (
        <p className="success">✓ Check your email for confirmation</p>
      )}
      {status === 'error' && (
        <p className="error">Something went wrong. Try again.</p>
      )}
      
      <p className="disclaimer">
        Unsubscribe anytime. Weekly digests only.
      </p>
    </form>
  );
}
```

### API Routes (Serverless Functions)

#### `/api/recommend` (POST)
```typescript
// Request
{
  "fingerprint": { /* Fingerprint object */ }
}

// Response
{
  "recommendations": [
    { /* Recommendation 1 */ },
    { /* Recommendation 2 */ },
    ...
  ],
  "fingerprint_id": "sha256_...",
  "generated_at": "2026-03-18T11:49:00Z"
}
```

#### `/api/subscribe` (POST)
```typescript
// Request
{
  "email": "user@example.com",
  "fingerprint": { /* Fingerprint object */ }
}

// Response (success)
{
  "subscribed": true,
  "email": "user@example.com",
  "fingerprint_id": "sha256_..."
}

// Implementation
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { email, fingerprint } = req.body;
  
  // Validate
  if (!email.match(EMAIL_REGEX)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  
  // Store in Supabase
  const fingerprint_id = hashFingerprint(fingerprint);
  const unsubscribe_token = generateSignedToken(email);
  
  await supabase
    .from('subscriptions')
    .insert({
      email,
      fingerprint,
      fingerprint_id,
      unsubscribe_token,
      created_at: new Date(),
    });
  
  // Return success
  return res.status(201).json({
    subscribed: true,
    fingerprint_id
  });
}
```

#### `/api/unsubscribe` (GET)
```typescript
// Request: GET /api/unsubscribe?token=<signed_jwt>
// Response: Redirect to success page

export default async function handler(req, res) {
  const { token } = req.query;
  
  try {
    // Verify JWT
    const { email } = verifyToken(token);
    
    // Delete from DB
    await supabase
      .from('subscriptions')
      .delete()
      .eq('email', email);
    
    // Redirect
    return res.redirect('/unsubscribed');
  } catch (err) {
    return res.status(400).json({ error: 'Invalid token' });
  }
}
```

### UI/UX Flow Wireframes

**Landing Page**:
```
┌─────────────────────────────────────┐
│  OllamaFit Logo                     │
│  "Find your perfect Ollama model"   │
│                                     │
│  [CTA: Get Started]                 │
│                                     │
│  Features:                          │
│  • Instant recommendations          │
│  • Hardware-aware                   │
│  • Community benchmarks             │
└─────────────────────────────────────┘
```

**Recommender Page**:
```
┌─────────────────────────────────────┐
│  Tab 1: Paste Mode | Tab 2: Manual  │
├─────────────────────────────────────┤
│                                     │
│  [Paste ollama info]                │
│  [or fill manual form]              │
│                                     │
│  [Get Recommendation]               │
│                                     │
├─────────────────────────────────────┤
│  RESULTS (below form)               │
│                                     │
│  🎯 BEST FIT                        │
│  ┌─────────────────────────────┐   │
│  │ llama3.2:70b - Balanced     │   │
│  │ 22.1 GB / 24 GB headroom    │   │
│  │ ~35 tok/s (120 reports)     │   │
│  │                             │   │
│  │ [Copy ollama run command]   │   │
│  │ [View on HF]                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ALTERNATIVES                       │
│  ┌─────────────────────────────┐   │
│  │ 2. llama3.2:13b - Balanced  │   │
│  │ 3. mistral:7b - Fast        │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Email opt-in for alerts]          │
└─────────────────────────────────────┘
```

---

## Part 4: CLI Tool Architecture

### Tech Stack
- **Language**: Go (1.20+)
- **Binary Size Target**: <50MB
- **Distribution**: Homebrew, Scoop, curl installer script
- **Build**: GitHub Actions + GoReleaser

### Go Project Structure
```
cli/
├─ main.go                 # Entry point
├─ cmd/
│  ├─ root.go             # Root command
│  ├─ recommend.go        # ollama-fit recommend
│  ├─ subscribe.go        # ollama-fit --subscribe
│  └─ benchmark.go        # ollama-fit --benchmark (Phase 3)
├─ pkg/
│  ├─ hardware/
│  │  ├─ detect.go        # GPU/CPU/RAM detection
│  │  ├─ nvidia.go
│  │  ├─ metal.go
│  │  └─ amd.go
│  ├─ fingerprint/
│  │  └─ generator.go
│  ├─ engine/             # Recommendation engine (compiled from TS)
│  │  └─ engine.go        # WASM wrapper OR HTTP client
│  ├─ models/
│  │  ├─ database.go      # Load YAML from GitHub
│  │  └─ types.go
│  ├─ api/
│  │  ├─ http.go          # HTTP clients
│  │  └─ subscribe.go
│  ├─ output/
│  │  ├─ human.go         # Terminal rendering
│  │  └─ json.go          # JSON output
│  └─ config/
│     └─ config.go
├─ go.mod
├─ go.sum
├─ Makefile
├─ .goreleaser.yml
└─ README.md
```

### Core Functions

#### Hardware Detection (Go)

```go
package hardware

import (
    "os"
    "os/exec"
    "runtime"
    "github.com/jaypipes/ghw"
)

type HardwareInfo struct {
    GPU         string
    VRAM_GB     float64
    CPU_Cores   int
    System_RAM  float64
    OS          string
    Arch        string
}

func Detect() (*HardwareInfo, error) {
    info := &HardwareInfo{
        OS:   runtime.GOOS,
        Arch: runtime.GOARCH,
    }
    
    // CPU detection
    cpu, err := ghw.CPU()
    if err == nil {
        info.CPU_Cores = cpu.TotalCores
    }
    
    // RAM detection
    memory, err := ghw.Memory()
    if err == nil {
        info.System_RAM = float64(memory.TotalPhysicalBytes) / (1024 * 1024 * 1024)
    }
    
    // GPU detection (platform-specific)
    switch runtime.GOOS {
    case "linux":
        return detectLinuxGPU(info)
    case "darwin":
        return detectAppleGPU(info)
    case "windows":
        return detectWindowsGPU(info)
    }
    
    return info, nil
}

// Linux: nvidia-smi
func detectLinuxGPU(info *HardwareInfo) (*HardwareInfo, error) {
    cmd := exec.Command("nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader")
    output, err := cmd.Output()
    if err == nil {
        // Parse output: "NVIDIA RTX 4090, 24576 MiB"
        info.GPU = parseNvidiaOutput(string(output))
        info.VRAM_GB = parseVRAMFromOutput(string(output))
        return info, nil
    }
    
    // Fallback: rocm-smi for AMD
    return detectAMDGPU(info)
}

// macOS: Metal (Apple Silicon detection)
func detectAppleGPU(info *HardwareInfo) (*HardwareInfo, error) {
    cmd := exec.Command("sysctl", "-n", "hw.model")
    output, _ := cmd.Output()
    chipID := strings.TrimSpace(string(output))
    
    // Map "Mac14,10" → "M2 Max" + memory
    chip := parseAppleChip(chipID)
    info.GPU = chip
    info.VRAM_GB = getAppleSiliconMemory(chip)
    
    return info, nil
}
```

#### Recommendation Integration (Go)

**Option A: WASM**
- Compile recommendation engine to WebAssembly
- Load WASM module in Go
- Call `recommendModel()` function directly
- Pros: Fast, zero network calls
- Cons: Larger binary, complex build

**Option B: HTTP to Web API**
- CLI calls web app's `/api/recommend` endpoint
- Send fingerprint JSON
- Parse response
- Pros: Simpler, always latest algorithm
- Cons: Requires network, slight latency

**Recommended**: Hybrid
- Ship with bundled Go port of engine (option A)
- Fall back to API if bundled engine outdated (option B)

```go
package engine

import (
    "github.com/wasm3/go-wasm3"
)

type RecommendationEngine struct {
    wasmModule *wasm3.Module
    runtime    *wasm3.Runtime
}

func NewEngine() (*RecommendationEngine, error) {
    // Load embedded WASM module
    wasmBytes := []byte{...} // Embedded engine.wasm
    
    runtime := wasm3.NewRuntime(1024 * 64)
    module, err := runtime.ParseModule(wasmBytes)
    if err != nil {
        return nil, err
    }
    
    return &RecommendationEngine{
        wasmModule: module,
        runtime:    runtime,
    }, nil
}

func (e *RecommendationEngine) Recommend(fp *Fingerprint) (*RecommendationResult, error) {
    // Call WASM function
    fn := e.runtime.FindFunction("scoreRecommendations")
    
    // Marshal fingerprint to JSON
    fpJSON, _ := json.Marshal(fp)
    
    // Call WASM
    result, err := fn.Call(fpJSON)
    if err != nil {
        return nil, err
    }
    
    // Parse result
    var rec *RecommendationResult
    json.Unmarshal(result.([]byte), &rec)
    
    return rec, nil
}
```

#### Terminal Output Rendering (Go)

```go
package output

import (
    "fmt"
    "github.com/charmbracelet/lipgloss"
)

func RenderHuman(result *RecommendationResult) {
    // Colors
    primary := lipgloss.NewStyle().
        Bold(true).
        Foreground(lipgloss.Color("12"))
    
    secondary := lipgloss.NewStyle().
        Foreground(lipgloss.Color("8"))
    
    success := lipgloss.NewStyle().
        Foreground(lipgloss.Color("10"))
    
    // Hero recommendation
    hero := result.Recommendations[0]
    
    fmt.Println(lipgloss.NewStyle().
        BorderStyle(lipgloss.RoundedBorder()).
        BorderForeground(lipgloss.Color("4")).
        Padding(1, 2).
        Render(
            fmt.Sprintf(
                "%s\n\n%s (%s)\nQuantization: %s\nVRAM: %s GB / %s GB\nSpeed: ~%d tok/s\n\n%s\n%s",
                primary.Render("🎯 BEST FIT FOR YOUR SYSTEM"),
                hero.ModelName,
                hero.Variant,
                hero.QuantizationLevel,
                fmt.Sprintf("%.1f", hero.VRAMRequired),
                fmt.Sprintf("%.1f", hero.VRAMHeadroom),
                hero.EstimatedTPS,
                success.Render(hero.OllamaCommand),
                secondary.Render("[https://huggingface.co/...]"),
            ),
        ))
    
    // Alternatives
    fmt.Println("\nAlternatives:")
    for i, alt := range result.Recommendations[1:5] {
        fmt.Printf("%d. %s (%s) - %s\n", i+2, alt.ModelName, alt.Variant, alt.Reason)
    }
    
    fmt.Println(secondary.Render("\nSubscribe to alerts?"))
    fmt.Println("$ ollama-fit --subscribe your@email.com")
}

func RenderJSON(result *RecommendationResult) {
    jsonBytes, _ := json.MarshalIndent(result, "", "  ")
    fmt.Println(string(jsonBytes))
}
```

#### Interactive Prompts (Go)

```go
package cmd

import (
    "github.com/manifoldco/promptui"
)

func promptUseCase() string {
    prompt := promptui.Select{
        Label: "What's your primary use case?",
        Items: []string{
            "Chat (instructions, conversation)",
            "Coding (code generation, debugging)",
            "RAG (document retrieval, Q&A)",
            "Vision (image understanding)",
            "Summarization (text summarization)",
        },
    }
    
    _, result, _ := prompt.Run()
    return mapUseCaseLabel(result)
}

func promptSpeedQuality() int {
    prompt := promptui.Select{
        Label: "Speed vs quality preference?",
        Items: []string{
            "1 - Maximum speed (low quality)",
            "2 - Fast (lower quality)",
            "3 - Balanced",
            "4 - Quality focused",
            "5 - Maximum quality (slowest)",
        },
    }
    
    index, _, _ := prompt.Run()
    return index + 1
}

func promptSubscribe() bool {
    prompt := promptui.Select{
        Label: "Get alerts when better models appear?",
        Items: []string{"Yes", "No"},
    }
    
    index, _, _ := prompt.Run()
    return index == 0
}
```

### Installation Methods

#### 1. Homebrew (macOS + Linux)

**Formula** (`ollama-fit.rb`):
```ruby
class OllamaFit < Formula
  desc "Spec-aware model intelligence layer for Ollama"
  homepage "https://ollamafit.dev"
  version "1.0.0"
  
  url "https://github.com/yourusername/ollama-fit/releases/download/v1.0.0/ollama-fit-#{os.mac? ? "darwin" : "linux"}-#{Hardware::CPU.arch}.tar.gz"
  sha256 "abc123def456..."
  
  def install
    bin.install "ollama-fit"
  end
  
  test do
    system "#{bin}/ollama-fit", "--version"
  end
end
```

**Installation**:
```bash
brew tap yourusername/ollama-fit
brew install ollama-fit
ollama-fit
```

#### 2. Scoop (Windows)

**Manifest** (`ollama-fit.json`):
```json
{
  "version": "1.0.0",
  "description": "Spec-aware model intelligence layer for Ollama",
  "homepage": "https://ollamafit.dev",
  "license": "MIT",
  "architecture": {
    "64bit": {
      "url": "https://github.com/yourusername/ollama-fit/releases/download/v1.0.0/ollama-fit-windows-amd64.zip",
      "hash": "sha256:abc123def456..."
    }
  },
  "bin": "ollama-fit.exe",
  "checkver": "github",
  "autoupdate": {
    "url": "https://github.com/yourusername/ollama-fit/releases/download/v$version/ollama-fit-windows-amd64.zip"
  }
}
```

**Installation**:
```bash
scoop bucket add ollama-fit https://github.com/yourusername/ollama-fit-scoop
scoop install ollama-fit
ollama-fit
```

#### 3. Curl (Universal)

**Script** (`install.sh`):
```bash
#!/bin/bash
set -e

VERSION="1.0.0"
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Map uname arch to Go arch
if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; fi
if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi

URL="https://github.com/yourusername/ollama-fit/releases/download/v${VERSION}/ollama-fit-${OS}-${ARCH}.tar.gz"

echo "Downloading ollama-fit v${VERSION}..."
curl -fsSL "$URL" | tar xz

# Move to /usr/local/bin
sudo mv ollama-fit /usr/local/bin/

echo "✓ ollama-fit installed!"
ollama-fit --version
```

**Installation**:
```bash
curl -fsSL https://install.ollamafit.dev | sh
```

---

## Part 5: Database Schema

### Supabase Tables

**Table: `subscriptions`**
```sql
CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  
  email VARCHAR(255) UNIQUE NOT NULL,
  fingerprint JSONB NOT NULL,
  fingerprint_id VARCHAR(64) NOT NULL UNIQUE,
  
  unsubscribe_token VARCHAR(128) NOT NULL UNIQUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_notified TIMESTAMP,
  notification_count INT DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  INDEX(email),
  INDEX(fingerprint_id),
  INDEX(created_at)
);
```

**Table: `notifications_sent` (analytics)**
```sql
CREATE TABLE notifications_sent (
  id BIGSERIAL PRIMARY KEY,
  
  subscription_id BIGINT REFERENCES subscriptions(id),
  model_id VARCHAR(50),
  trigger_type VARCHAR(50), -- "new_model", "better_quant", "drift_detection", "retirement"
  
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  
  INDEX(subscription_id),
  INDEX(sent_at)
);
```

---

This document covers system design, architecture, data flows, implementation details, and deployment strategy. Ready for Phase 1 launch.
