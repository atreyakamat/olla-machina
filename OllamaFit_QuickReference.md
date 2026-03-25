# OllamaFit: Visual Architecture & Quick Reference
**One-page diagrams + checklists | Print this out**

---

## SYSTEM ARCHITECTURE (One Diagram)

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER FACING LAYER                          │
├────────────────────────────┬─────────────────────────────────────┤
│                            │                                     │
│   ollamafit.app            │        ollama-fit CLI               │
│   (React + Vite)           │        (Go Binary)                  │
│                            │                                     │
│  • Form input              │    • Auto-detect GPU                │
│  • Paste ollama info       │    • Interactive prompts            │
│  • Recommendations card    │    • Terminal output                │
│  • Email signup            │    • JSON export                    │
│  • Copy command            │    • --subscribe flag               │
│                            │                                     │
└──────────────┬─────────────┴──────────────┬──────────────────────┘
               │                            │
               └────────────┬───────────────┘
                            │
                 ┌──────────▼──────────┐
                 │  RECOMMENDATION     │
                 │  ENGINE             │
                 │  (TypeScript)       │
                 │                     │
                 │ • Score algorithm   │
                 │ • Quant math        │
                 │ • Fingerprinting    │
                 │ • Ranking           │
                 │                     │
                 └──────┬────────┬─────┘
                        │        │
        ┌───────────────▼──┐  ┌──▼──────────────┐
        │   Model DB       │  │  Benchmarks    │
        │   (YAML)         │  │  (Supabase)    │
        │   GitHub         │  │  Community     │
        │                  │  │  Real data     │
        │ 30+ models       │  │                │
        │ Community PRs    │  │ GPU type:      │
        │                  │  │ Model: RTX4090 │
        │ • llama3.2       │  │ Throughput:98  │
        │ • mistral        │  │ Reports: 12    │
        │ • phi            │  │                │
        │                  │  │                │
        └──────────────────┘  └────────────────┘
                        │
        ┌───────────────▼──────────────┐
        │  NOTIFICATION SYSTEM         │
        │  (Supabase + Resend)         │
        │                              │
        │ • Weekly cron job           │
        │ • Email subscriptions        │
        │ • Fingerprint storage        │
        │ • Unsubscribe links          │
        │ • Analytics tracking         │
        │                              │
        └──────────────────────────────┘
```

---

## DATA FLOW: From Input to Output

```
USER INPUTS
    │
    ├─→ [PASTE MODE] → JSON from ollama info
    │
    └─→ [FORM MODE] → GPU type + VRAM + use case + preferences
            │
            └─→ Generate Fingerprint
                  │
                  ├─ Hardware: {gpu, cpu, ram, os}
                  ├─ Use case: {primary, context_window_min}
                  ├─ Preferences: {speed_vs_quality, vram_util}
                  └─ Timestamp + source
                      │
                      └─→ RECOMMENDATION ENGINE
                            │
                            ├─ STEP 1: Filter by use case
                            │   └─→ Only models that do chat/coding/etc
                            │
                            ├─ STEP 2: Filter by VRAM
                            │   └─→ Find best quant that fits
                            │
                            ├─ STEP 3: Score (0.0-1.0)
                            │   • Fit ratio (40%)
                            │   • Speed estimate (30%)
                            │   • Quality score (20%)
                            │   • Recency (10%)
                            │
                            ├─ STEP 4: Sort by score
                            │
                            └─→ RECOMMENDATIONS OUTPUT
                                  │
                                  ├─ Hero: Best fit model
                                  │   └─ Why it matches
                                  │   └─ Copy-paste command
                                  │   └─ Est. speed + VRAM
                                  │
                                  └─ Alternatives: Top 4 others
                                      └─ Different speed/quality tradeoffs

OUTPUT RENDERING
    │
    ├─→ [WEB] → Beautiful cards + Email opt-in
    │           → Copy button, HF link, benchmarks
    │
    └─→ [CLI] → Terminal with colors + Unicode
                → ollama run command highlighted
                → [Subscribe] prompt
```

---

## TECHNOLOGY STACK: One-Liner Per Tool

```
FRONTEND (Web App):
  ✓ React 18           — UI components, state management
  ✓ TypeScript        — Type safety, catches errors early
  ✓ Vite              — Lightning-fast dev server + builds
  ✓ Tailwind CSS      — Rapid styling, responsive design
  ✓ React Query       — Data fetching, caching, real-time
  ✓ React Hook Form   — Performant form handling
  ✓ Zod              — Schema validation, type inference

BACKEND (API):
  ✓ Node.js 20        — JavaScript runtime, fast startup
  ✓ Express.js        — Lightweight HTTP framework
  ✓ TypeScript        — Type-safe API contracts
  ✓ Supabase          — PostgreSQL database, real-time, auth
  ✓ Resend            — Email delivery, developer-friendly
  ✓ node-cron         — Scheduled jobs (notifications)

CLI (Command Line):
  ✓ Go 1.20+          — Compiled, single binary, fast
  ✓ Cobra             — CLI subcommands, help, flags
  ✓ ghw               — Hardware detection cross-platform
  ✓ lipgloss          — Beautiful terminal output
  ✓ Viper             — Configuration management

SHARED ENGINE:
  ✓ TypeScript        — Shared between web + CLI (via WASM or API)
  ✓ Vitest            — Fast unit testing, ESM-native
  ✓ Zod              — Input validation, type safety

DEPLOYMENT:
  ✓ Vercel            — Web app hosting, serverless functions
  ✓ Render / Fly.io   — API backend, easy deployment
  ✓ GitHub Actions    — CI/CD, automated testing
  ✓ GoReleaser        — Automated binary builds (CLI)
```

---

## RECOMMENDATION ENGINE ALGORITHM (Pseudocode)

```python
def scoreRecommendations(fingerprint, models):
    """
    Input: User's hardware + preferences
    Output: Ranked list of best models to run
    """
    
    # STEP 1: Filter candidates
    candidates = []
    for model in models:
        if model.use_cases has fingerprint.use_case:
            if model.context_window >= fingerprint.context_min:
                if can_fit_in_vram(model, fingerprint.vram):
                    candidates.append(model)
    
    # STEP 2: Score each candidate
    scores = []
    for model in candidates:
        quant = find_best_quant(model, fingerprint.vram)
        
        vram_used = calculate_vram(model.params, quant)
        headroom = fingerprint.vram - vram_used
        
        # Composite scoring
        fit_score = 0.4 * (headroom / fingerprint.vram)
        speed_score = 0.3 * (estimated_tps / 100)
        quality_score = 0.2 * QUANT_QUALITY[quant]
        recency_score = 0.1 * (if model.age < 30_days: 1.0 else 0)
        
        total_score = fit_score + speed_score + quality_score + recency_score
        
        scores.append({
            'model': model,
            'quant': quant,
            'score': total_score
        })
    
    # STEP 3: Sort and return top 5
    return sorted(scores, key=score, reverse=True)[:5]
```

---

## VRAM CALCULATION: The Math

```
FORMULA:
  VRAM (GB) = (Parameters × Bytes Per Param) / (1024³) + Overhead

QUANTIZATION BYTES PER PARAM:
  Q4_K_M    → 0.50 bytes   (4-bit quantization)
  Q5_K_M    → 0.63 bytes   (5-bit quantization)
  Q8_0      → 1.00 bytes   (8-bit quantization)
  F16       → 2.00 bytes   (full precision)

EXAMPLES:
  7B model @ Q4_K_M:
    7 × 0.50 = 3.5 GB per model
    + 3% overhead = 3.6 GB total
    
  70B model @ Q4_K_M:
    70 × 0.50 = 35 GB per model
    + 3% overhead = 36 GB total
    (Won't fit in consumer GPU!)
    
  70B model @ Q5_K_M (if using Hybrid Mode):
    Can offload to system RAM
    Uses: 24GB VRAM + 20GB system RAM
    Speed penalty: ~20% (VRAM → RAM slower)
```

---

## PHASES & MILESTONES (6-Month Sprint)

```
PHASE 1: FOUNDATION (Weeks 1-6)
├─ Week 1-2: Engine + database
├─ Week 3: Web app live
├─ Week 4-5: CLI tool + distribution
├─ Week 6: Launch (Product Hunt, HN, Reddit)
├─ Target: 1,000+ users
└─ Success: Recommendations >85% accurate

PHASE 2: RETENTION (Weeks 7-12)
├─ Week 7-8: Email infrastructure
├─ Week 9-10: Notification pipeline
├─ Week 11-12: Community database
├─ Target: 3,000+ subscribers
└─ Success: 15%+ email open rate

PHASE 3: INTELLIGENCE (Months 4-6)
├─ Month 4: Benchmark collection
├─ Month 5: Modelfile optimizer
├─ Month 6: Market leadership
├─ Target: 50+ hardware configs with real data
└─ Success: Data moat formed

CRITICAL DATES:
  Week 6: Launch day (if slip, momentum loss)
  Week 12: Email validation (if <10% open rate, pivot)
  Month 6: Data moat check (if <30 configs, raise TAM question)
```

---

## TEAM & SKILLS MATRIX

```
ROLE 1: Full-Stack Engineer (40 hrs/week)
├─ React 18 + TypeScript (EXPERT)
├─ Node.js + Express (INTERMEDIATE)
├─ PostgreSQL (INTERMEDIATE)
├─ DevOps basics (INTERMEDIATE)
└─ Cost: $80-150k/year or $40-50/hr contract

ROLE 2: Go CLI Developer (10-15 hrs/week, contractor)
├─ Go fundamentals (EXPERT)
├─ CLI development (INTERMEDIATE)
├─ Cross-platform coding (INTERMEDIATE)
└─ Cost: $60-80/hr

ROLE 3: Product/Design (40 hrs/week, founder or hire)
├─ User research (INTERMEDIATE)
├─ Roadmapping (INTERMEDIATE)
├─ Community management (INTERMEDIATE)
└─ Cost: $0 (founder) or $80-120k/year

ROLE 4: DevOps/Infra (5 hrs/week, contractor)
├─ GitHub Actions (INTERMEDIATE)
├─ Supabase/PostgreSQL (BASIC)
├─ Vercel/Render (BASIC)
└─ Cost: $80-100/hr

MINIMUM VIABLE TEAM: 2 founders + 1-2 contractors
IDEAL TEAM: 4-5 people (founder + 3-4 hires)
```

---

## LAUNCH CHECKLIST (Week 6)

```
CODE READINESS:
  ☐ Recommendation engine 95%+ test coverage
  ☐ Web app mobile-responsive tested
  ☐ CLI binaries built for 5+ platforms
  ☐ All APIs have error handling
  ☐ No console.error or TODO comments

DEPLOYMENT:
  ☐ Web app live on ollamafit.app (via Vercel)
  ☐ API running on Render/Fly.io
  ☐ Database migrations applied
  ☐ Environment variables configured
  ☐ Monitoring (Sentry) active

DOCUMENTATION:
  ☐ README.md complete
  ☐ Contributing guide written
  ☐ API docs published
  ☐ FAQ answered (top 10 questions)
  ☐ Blog post drafted ("Guide to Ollama quantization")

MARKETING:
  ☐ Product Hunt post ready (screenshot + description)
  ☐ Hacker News story drafted
  ☐ Reddit posts queued (r/ollama, r/LocalLLama, r/StableDiffusion)
  ☐ Twitter thread written
  ☐ Ollama community notified in advance

ANALYTICS:
  ☐ Posthog or Mixpanel configured
  ☐ Key events tracked (form submit, recommend, email signup)
  ☐ Dashboard created (daily active users, recommendations, etc.)
  ☐ Goals set (1,000 users by end of week)
  ☐ Alerts configured (error spikes)
```

---

## CRITICAL SUCCESS FACTORS (Top 5)

```
#1: RECOMMENDATION ACCURACY
    ├─ If wrong model recommended
    └─ Users abandon + bad reputation
    └─ Fix: Obsessive testing + user feedback loop

#2: LAUNCH MOMENTUM
    ├─ 1,000+ users in week 1
    └─ Network effects + organic growth begins
    └─ Fix: Product Hunt + Hacker News traction

#3: RETENTION VIA EMAIL
    ├─ 15%+ email open rate by week 12
    └─ Notification system works
    └─ Fix: Email A/B testing + cadence optimization

#4: COMMUNITY CONTRIBUTIONS
    ├─ 50+ model database PRs by week 12
    └─ Flywheel: More models → more recommendations → more users → more submissions
    └─ Fix: Clear CONTRIBUTING guide + incentives

#5: DATA MOAT FORMATION
    ├─ 1,000+ benchmark submissions by month 6
    ├─ 50+ hardware configurations with real data
    └─ Unforkable competitive advantage
    └─ Fix: Make benchmark collection frictionless
```

---

## BUDGET BREAKDOWN (6-Month Runway)

```
PEOPLE (60% of costs):
  Full-stack engineer        $30-50k (part-time) or $60-80k (FT)
  Go developer              $15-25k (contractor)
  Product/Design            $0 (founder) or $30-50k (hire)
  DevOps contractor         $5-10k (as needed)
  ─────────────────────────
  Subtotal: $50-215k

INFRASTRUCTURE (5% of costs):
  Supabase                  $0-25/mo (free tier sufficient)
  Vercel                    $0-20/mo (free tier sufficient)
  Render/Fly.io            $0-50/mo (free tier sufficient)
  Resend                    $0-20/mo (free tier 100 emails/day)
  Monitoring (Sentry)       $0-30/mo (free tier sufficient)
  ─────────────────────────
  Subtotal: $0-145/mo ($0-900 for 6 months)

MARKETING (5% of costs):
  Ads (optional)            $0-2k
  Domain                    $50
  Launch event/swag         $500-1k
  ─────────────────────────
  Subtotal: $550-3k

MISCELLANEOUS (30% of costs):
  Contingency (unexpected)  10-15% of total
  Legal/entity formation    $500-2k
  ─────────────────────────
  Subtotal: $2.5-10k

TOTAL 6-MONTH BUDGET: $200-300k (bootstrappable: $30-50k minimal)
```

---

## ONE-PAGE DECISION FRAMEWORK

```
SHOULD YOU BUILD OLLAMAFIT?

🟢 YES IF:
  ✓ Love building developer tools
  ✓ 6-week execution timeline realistic for you
  ✓ Can engage Reddit/Discord communities authentically
  ✓ Willing to open-source model database
  ✓ Comfortable with low margins initially

🔴 NO IF:
  ✗ Need enterprise $$$$ from day 1
  ✗ Can't commit 18+ months
  ✗ Want 50%+ margins (developer tools = low margin)
  ✗ Uncomfortable with technical depth
  ✗ Need to raise $5M+ (bootstrappable, not venture-scale)

GO/NO-GO DECISION TIMELINE:
  Today: Read all 4 documents (6 hours)
  Tomorrow: Team alignment meeting (2 hours)
  Day 3: Resource commitment decision (1 hour)
  Day 4: Start Week 1 or kill project (1 hour)
```

---

## PRINT THIS PAGE, PIN IT TO YOUR WALL

This is everything you need to build Phase 1.

Everything else is details.

**Now go ship it. 🚀**
