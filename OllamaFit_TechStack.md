# OllamaFit - Tech Stack, Skills & Implementation Roadmap
**Version 2.0 | March 2026 | Confidential**

---

## Part 1: Complete Tech Stack

### Frontend: Web App

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React 18 | Industry standard, large ecosystem, TypeScript support |
| **Language** | TypeScript 5.0+ | Type safety, better IDE support, catches errors early |
| **Build Tool** | Vite | Fast HMR, modern ESM, zero-config for our use case |
| **CSS** | Tailwind CSS 4 | Utility-first, rapid prototyping, mobile-first by default |
| **Component Library** | shadcn/ui | Headless, accessible components, fully customizable |
| **HTTP Client** | TanStack Query (React Query) | Built-in caching, stale-while-revalidate, perfect for async data |
| **Form Library** | React Hook Form | Lightweight, performant, minimal re-renders |
| **Validation** | Zod | Type-safe schema validation, transforms |
| **Icons** | Lucide React | Tree-shakable, modern, 1000+ icons |
| **Markdown** | markdown-to-jsx | Render model descriptions in rich format |
| **Analytics** | Posthog (self-hosted) | Event tracking, feature flags, session replay (privacy-first) |
| **Error Tracking** | Sentry | Performance monitoring, error reporting |
| **Deployment** | Vercel | Serverless functions, edge caching, zero-config Next.js (optional) |

**Package.json Highlights**:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "tailwindcss": "^4.0.0",
    "shadcn-ui": "^0.8.0",
    "lucide-react": "^0.292.0",
    "axios": "^1.6.0",
    "markdown-to-jsx": "^7.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^4.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31"
  }
}
```

---

### Backend: API Layer

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Node.js 20 LTS | JavaScript everywhere, fast startup for serverless |
| **Framework** | Express.js (or Remix/Fastify) | Lightweight, middleware-friendly, large ecosystem |
| **Language** | TypeScript | Type safety for API contracts |
| **Validation** | Zod | Schema validation + type inference |
| **Database** | Supabase (PostgreSQL) | Serverless Postgres, real-time subscriptions, built-in auth |
| **Email Service** | Resend or Postmark | Developer-first, easy templates, reliable delivery |
| **Background Jobs** | Node-cron + Supabase Functions | Scheduled notifications, low-cost alternative to dedicated job queue |
| **API Documentation** | OpenAPI + Swagger UI | Auto-generated docs, client SDK generation |
| **Environment Config** | dotenv + zod parsing | Type-safe environment variables |
| **Logging** | Pino or Winston | Structured logging, JSON output, performance-optimized |
| **Cache Layer** | Redis (optional, Upstash) | Cache model database, fingerprint lookups |

**Package.json Highlights**:
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "typescript": "^5.0.0",
    "zod": "^3.22.0",
    "@supabase/supabase-js": "^2.38.0",
    "resend": "^2.0.0",
    "node-cron": "^3.0.2",
    "pino": "^8.16.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0"
  }
}
```

---

### CLI Tool: Go Backend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Language** | Go 1.20+ | Compiled, single binary, minimal dependencies, fast startup |
| **CLI Framework** | Cobra | Subcommands, flags, help generation |
| **Hardware Detection** | ghw library + exec | Cross-platform GPU/CPU/RAM detection |
| **Output Formatting** | Lipgloss + Bubbles | Beautiful terminal UI, colors, formatting |
| **JSON Output** | encoding/json | Native JSON marshaling |
| **HTTP Client** | net/http + fasthttp | Standard library sufficient, no external deps needed |
| **Configuration** | Viper | Config file + env variable support |
| **Testing** | testify + table-driven tests | Standard Go testing patterns |
| **Binary Distribution** | GoReleaser | Automated builds for 10+ platforms |
| **WASM Runtime** (optional) | wasm3-go | Embedded recommendation engine (if WASM approach used) |

**go.mod Structure**:
```go
module github.com/yourusername/ollama-fit

go 1.20

require (
    github.com/spf13/cobra v1.7.0
    github.com/spf13/viper v1.18.0
    github.com/jaypipes/ghw v0.12.0
    github.com/charmbracelet/lipgloss v0.9.1
    github.com/charmbracelet/bubbles v0.17.1
)
```

---

### Shared: Recommendation Engine

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Language** | TypeScript | Write once, run in browser + Node.js + WASM |
| **Module Format** | ESM + CommonJS exports | Maximum compatibility |
| **Testing** | Vitest + @testing-library/dom | Fast, ESM-native, comprehensive coverage |
| **Bundling** | esbuild | Fast builds, small output, zero-config ESM |
| **WASM Compilation** | (optional) Binaryen / emcc | If compiling TS to WASM for CLI |
| **Documentation** | TypeDoc | Auto-generated API docs |

**File Structure**:
```
engine/
├─ src/
│  ├─ index.ts              # Main export
│  ├─ scorer.ts             # Scoring algorithm (pure function)
│  ├─ quantization.ts       # VRAM calculations
│  ├─ fingerprinter.ts      # Spec → JSON fingerprint
│  ├─ types.ts              # Exported types
│  └─ utils/
│     ├─ vram-calculator.ts
│     └─ use-case-matcher.ts
├─ test/
│  ├─ scorer.test.ts
│  └─ quantization.test.ts
├─ tsconfig.json
├─ package.json
└─ dist/                    # Built output
   ├─ index.d.ts
   ├─ index.js
   └─ index.cjs
```

---

### Databases & External Services

| Service | Purpose | Tier | Cost (approx) |
|---------|---------|------|---------|
| **Supabase (PostgreSQL)** | Subscriptions, benchmarks, notifications | Free: 1GB, $25+/mo | $0-100/mo |
| **GitHub (YAML repo)** | Model database, community PRs | Free | $0 |
| **Resend** | Email delivery | Free: 100/day, $20/mo | $0-50/mo |
| **Vercel** | Web app hosting | Free tier available | $0-50/mo |
| **Render** | API backend | Free tier available | $0-25/mo |
| **Upstash Redis** | Optional caching | Free: 10k commands/day | $0-30/mo |
| **Posthog** | Self-hosted analytics | Free: 1M events/mo | $0-50/mo |

**Total MVP Cost**: $0-200/month (free tier startups can run fully free)

---

## Part 2: Required Expertise & Skills Matrix

### Team Composition

**Minimum Viable Team**: 2 founders + 1 contractor

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│ Founder A:           Founder B:          Contractor:  │
│ • Full-stack dev     • Design/Product    • Go expert   │
│ • TypeScript         • Marketing         • DevOps      │
│ • React + Node.js    • Community mgmt    • CI/CD       │
│ • Databases          • Growth            • Binary dist │
│ • 30-40 hrs/week     • 30-40 hrs/week    • 10-15 hrs   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Skill Requirements by Role

#### Role 1: Full-Stack Engineer (Founder or Core Contributor)

**Required Skills**:
- ✅ **React 18+** (components, hooks, state management)
- ✅ **TypeScript** (types, interfaces, generics, utility types)
- ✅ **Node.js** (Express.js, async/await, middleware)
- ✅ **PostgreSQL/SQL** (schema design, queries, migrations)
- ✅ **API Design** (REST principles, error handling, versioning)
- ✅ **Authentication & Authorization** (JWT, session management)
- ✅ **Git & GitHub** (version control, branching, code review)
- ✅ **Deployment** (understanding serverless, Docker basics)

**Desirable Skills**:
- 🎯 **Real-time Data** (WebSockets, Server-Sent Events)
- 🎯 **Performance Optimization** (React profiling, database indexing)
- 🎯 **Testing** (unit tests, integration tests, E2E tests)
- 🎯 **Linux/Unix** (basic shell scripting, system navigation)

**Estimated Time to Contribution**: 0 days (hire senior engineer)

---

#### Role 2: Go Engineer / CLI Developer

**Required Skills**:
- ✅ **Go fundamentals** (goroutines, channels, packages, interfaces)
- ✅ **CLI development** (Cobra, argument parsing, subcommands)
- ✅ **Cross-platform coding** (Linux, macOS, Windows differences)
- ✅ **System APIs** (exec, os, syscall, subprocess handling)
- ✅ **Binary distribution** (GoReleaser, Homebrew, Scoop)
- ✅ **Hardware detection** (parsing system info, shell commands)
- ✅ **Testing** (table-driven tests, mocking)

**Desirable Skills**:
- 🎯 **Performance optimization** (profiling, benchmarking)
- 🎯 **WASM** (if embedding recommendation engine)
- 🎯 **Container concepts** (Docker, deployment)

**Estimated Time to Contribution**: 1-2 weeks (experienced Go dev)

---

#### Role 3: Product/Design

**Required Skills**:
- ✅ **User research** (interviews, survey design)
- ✅ **UI/UX principles** (accessibility, usability, visual hierarchy)
- ✅ **Figma or similar** (wireframes, design systems, prototypes)
- ✅ **Product strategy** (roadmapping, prioritization, metrics)
- ✅ **Writing** (documentation, marketing copy, email)
- ✅ **Community management** (Reddit, GitHub, Discord, Hacker News)

**Desirable Skills**:
- 🎯 **Developer marketing** (thought leadership, content creation)
- 🎯 **Growth hacking** (viral mechanics, network effects)
- 🎯 **Analytics** (interpreting user behavior, funnel analysis)

**Estimated Time to Contribution**: Immediate

---

#### Role 4: DevOps / Infrastructure (Contractor)

**Required Skills**:
- ✅ **GitHub Actions** (CI/CD pipelines, automated testing)
- ✅ **Deployment platforms** (Vercel, Render, AWS, GCP basics)
- ✅ **Database operations** (Supabase, migrations, backups)
- ✅ **Monitoring** (error tracking, performance metrics)
- ✅ **Security basics** (HTTPS, secrets management, auth)
- ✅ **Containerization** (Docker basics, image optimization)

**Estimated Time to Contribution**: 2 weeks setup, 2 hrs/week maintenance

---

### Skill Development Checklist (If Hiring Junior Developer)

| Skill | Current | Target | Timeline | Resources |
|-------|---------|--------|----------|-----------|
| TypeScript | Intermediate | Advanced | 4 weeks | TypeScript Handbook + projects |
| React Hooks | Intermediate | Advanced | 3 weeks | React docs + React Query deep dive |
| Express.js | Beginner | Intermediate | 2 weeks | Express tutorials + building small API |
| PostgreSQL | Beginner | Intermediate | 3 weeks | PostgreSQL docs + schema design practice |
| Zod Validation | None | Intermediate | 1 week | Zod docs + real-world examples |
| Testing (Vitest) | Beginner | Intermediate | 2 weeks | Vitest docs + writing 50+ tests |

**Total Ramp-up Time**: 8-10 weeks for junior dev (then productive contributor)

---

## Part 3: Implementation Flow & Execution Plan

### Phase 1: Foundation (Weeks 1-6)

#### Week 1: Planning & Architecture

**Deliverables**:
- ✅ Tech stack finalized (this document approved)
- ✅ Database schema designed (Supabase SQL ready)
- ✅ API specification (OpenAPI YAML)
- ✅ Recommendation engine algorithm pseudo-code in TypeScript
- ✅ GitHub repo created, CI/CD pipeline skeleton

**Tasks**:
```
Monday:
  [ ] Create GitHub organization + repos (web, api, cli, engine)
  [ ] Set up Supabase project (PostgreSQL + Auth)
  [ ] Create Vercel + Render projects
  [ ] Invite team to repos + services

Tuesday-Wednesday:
  [ ] Design DB schema (subscriptions, notifications)
  [ ] Document API routes (recommend, subscribe, unsubscribe)
  [ ] Write TypeScript types (Recommendation, Fingerprint, etc.)
  [ ] Stub out recommendation engine functions

Thursday-Friday:
  [ ] Create 30-model database (YAML schema)
  [ ] Set up GitHub Actions for testing
  [ ] Create project board (Phase 1 tasks)
  [ ] Hold team alignment meeting
```

**Success Criteria**:
- [ ] All team members can spin up local development environment
- [ ] GitHub Actions workflow runs (even if mostly stubs)
- [ ] Database schema reviewed and approved

---

#### Week 2: Recommendation Engine Core

**Deliverables**:
- ✅ Recommendation engine fully functional (scoring + quantization math)
- ✅ 100% test coverage for engine
- ✅ Model database loader (YAML parsing)
- ✅ Benchmark database schema + sample data

**Tasks**:
```
Full Week (40 hours):
  [ ] Implement scorer.ts (scoring algorithm)
  [ ] Implement quantization.ts (VRAM calculations)
  [ ] Implement fingerprinter.ts (spec → JSON)
  [ ] Write 50+ unit tests (Vitest)
  [ ] Create sample model database (30 models in YAML)
  [ ] Benchmark engine performance (<100ms per recommendation)
  [ ] Document engine API (TypeDoc)
```

**Code Outline** (what gets written):
```typescript
// engine/src/scorer.ts (150 lines)
export function scoreRecommendations(
  fingerprint: Fingerprint,
  models: Model[],
  benchmarks: Benchmark[]
): Recommendation[] {
  // STEP 1: Filter candidates
  // STEP 2: Calculate metrics
  // STEP 3: Score & rank
  // STEP 4: Return top 5
}

// engine/src/quantization.ts (100 lines)
export function computeVRAMRequired(params: number, quant: string): number {
  // Lookup bytes per param for quant level
  // Multiply by param count
  // Add Ollama overhead
  // Return GB
}

// engine/__tests__/scorer.test.ts (200 lines)
describe('scoreRecommendations', () => {
  it('returns top model for 8GB GPU with chat use case', () => { ... })
  it('applies speed vs quality preference correctly', () => { ... })
  it('detects hybrid mode when needed', () => { ... })
  // ... 20+ more test cases
})
```

**Success Criteria**:
- [ ] All tests pass (100% coverage)
- [ ] Engine latency <100ms for 30 models
- [ ] Recommendation accuracy validated manually (10+ test cases)

---

#### Week 3: Web App MVP

**Deliverables**:
- ✅ Web app deployed to Vercel (ollamafit.app)
- ✅ Form + paste input modes working
- ✅ Recommendations displayed with copy-paste commands
- ✅ Mobile responsive design

**Tasks**:
```
Frontend (React):
  [ ] Create project structure in Vite
  [ ] Build InputForm component (manual form + validation)
  [ ] Build PasteMode component (JSON input + parsing)
  [ ] Build RecommendationCard component (hero + alternatives)
  [ ] Build Layout component (nav, footer, responsive grid)
  [ ] Style with Tailwind (mobile-first, light theme)
  [ ] Add copy-to-clipboard functionality
  [ ] Test form submission flow

API (Node.js):
  [ ] Create Express server
  [ ] Implement POST /api/recommend endpoint
  [ ] Integrate recommendation engine (npm module import)
  [ ] Add error handling + input validation (Zod)
  [ ] Add CORS headers
  [ ] Deploy to Render (serverless)

DevOps:
  [ ] Set up GitHub Actions (test + deploy on push)
  [ ] Configure Vercel deployment (zero-config)
  [ ] Set up environment variables (.env.local, .env.production)
  [ ] Add error tracking (Sentry)
```

**UI/UX Checklist**:
- [ ] Form inputs have clear labels + help text
- [ ] Recommendation cards show: model name, quant, VRAM, speed estimate
- [ ] Copy button shows success feedback (toast notification)
- [ ] Mobile layout tested (phone + tablet)
- [ ] Accessibility tested (keyboard navigation, screen reader)

**Success Criteria**:
- [ ] Web app deployed and publicly accessible
- [ ] Can submit form → get recommendation in <2s
- [ ] Paste mode works with real `ollama info` JSON
- [ ] Mobile-responsive design validated

---

#### Week 4: CLI Tool v1.0

**Deliverables**:
- ✅ CLI tool compiles to Go binary (~40MB)
- ✅ Auto-detect hardware (GPU, CPU, RAM, OS)
- ✅ Interactive prompts for use case + preferences
- ✅ Output recommendations in terminal + JSON format
- ✅ CLI available via Homebrew, Scoop, curl

**Tasks**:
```
Go Development:
  [ ] Initialize Go module + project structure
  [ ] Implement hardware detection (nvidia-smi, metal, rocm)
  [ ] Implement interactive prompts (Cobra + promptui)
  [ ] Integrate recommendation engine (call API or WASM)
  [ ] Implement terminal rendering (lipgloss, colors)
  [ ] Implement JSON output (--json flag)
  [ ] Write tests (table-driven tests, mocking)
  [ ] Build Go binary for 5+ platforms (GoReleaser)

Distribution Setup:
  [ ] Create Homebrew formula (ollama-fit.rb)
  [ ] Create Scoop manifest (ollama-fit.json)
  [ ] Create curl installer script (install.sh)
  [ ] Test installations on macOS, Linux, Windows
  [ ] Document installation methods (README)
```

**CLI Interaction Test**:
```bash
$ ollama-fit
# [Auto-detects hardware]
# GPU: NVIDIA RTX 4090 (24GB VRAM)
# [Prompts user]
# Use case? [1] chat [2] coding...
# Speed vs quality? [1-5]
# [Shows recommendation]
# Subscribe to alerts? Y/N
```

**Success Criteria**:
- [ ] Binary compiles on 5+ platforms
- [ ] Hardware detection works on Linux, macOS, Windows
- [ ] CLI installation works via all 3 methods
- [ ] Recommendations match web app output

---

#### Week 5: Distribution & Polish

**Deliverables**:
- ✅ CLI binaries in GitHub Releases (with checksums)
- ✅ Homebrew + Scoop repos set up
- ✅ Install documentation + troubleshooting guides
- ✅ Model database with 30+ verified models
- ✅ Landing page + docs site

**Tasks**:
```
Landing Page:
  [ ] Create landing.tsx (hero + features + CTA)
  [ ] Add FAQ section (top 10 questions)
  [ ] Add testimonials placeholder
  [ ] Add GitHub star button
  [ ] SEO optimization (meta tags, structured data)

Documentation:
  [ ] Write quickstart guide (web + CLI)
  [ ] Document quantization levels (plain English)
  [ ] Create troubleshooting guide (common issues)
  [ ] Write blog post: "Guide to Ollama quantization"

Model Database:
  [ ] Verify 30 models (VRAM requirements, use cases)
  [ ] Add community benchmark samples
  [ ] Create YAML CI validation
  [ ] Document PR process for community

Distribution:
  [ ] Publish to Homebrew Tap
  [ ] Submit to Scoop Bucket
  [ ] Create GitHub Releases with automated notes
  [ ] Verify downloads + checksums
```

**Success Criteria**:
- [ ] Landing page deployed and SEO-optimized
- [ ] CLI available via brew install ollama-fit
- [ ] Model database accurate (spot-check 10 models)
- [ ] Docs comprehensive (0 "coming soon" sections)

---

#### Week 6: Launch & Marketing

**Deliverables**:
- ✅ Public launch (Product Hunt, Hacker News, Reddit)
- ✅ 1,000+ web form submissions
- ✅ 500+ CLI downloads
- ✅ Community engagement (Discord, Reddit threads)

**Tasks**:
```
Pre-Launch (Days 1-2):
  [ ] Create Product Hunt post (description + screenshots)
  [ ] Write Hacker News post (clear, technical value prop)
  [ ] Draft Reddit threads (r/ollama, r/LocalLLama, r/StableDiffusion)
  [ ] Prepare Twitter/X thread
  [ ] Reach out to Ollama maintainers (mention, endorse)

Launch Day (Day 3):
  [ ] Post to Product Hunt (6-8am PT for visibility)
  [ ] Submit to Hacker News (same time)
  [ ] Post Reddit threads
  [ ] Tweet/X thread announcing
  [ ] Share in Ollama Discord

Post-Launch (Week 6):
  [ ] Monitor Product Hunt comments + respond
  [ ] Monitor Hacker News thread + answer questions
  [ ] Collect early feedback + bug reports
  [ ] Fix critical bugs immediately
  [ ] Write launch blog post on personal blog / Medium

Metrics Tracking:
  [ ] PH upvotes (target: 500+)
  [ ] HN points (target: 300+)
  [ ] Web app sessions (target: 1,000+)
  [ ] CLI downloads (target: 500+)
  [ ] GitHub stars (target: 100+)
```

**Social Proof Building**:
- Tag relevant influencers (Papers with Code, Hugging Face team)
- Reference in comments on related discussions
- Create GIF demo of CLI (post on Twitter)
- Ask early users for testimonials

**Success Criteria**:
- [ ] Launch day: 1,000+ web visits
- [ ] Launch day: 100+ Product Hunt upvotes
- [ ] Week 1: 1,000+ total web form submissions
- [ ] Week 1: 500+ CLI downloads
- [ ] Week 1: 150+ GitHub stars

---

### Phase 2: Retention System (Weeks 7-12)

#### Week 7-8: Email Infrastructure

**Deliverables**:
- ✅ Email subscription system (Supabase + Resend)
- ✅ Fingerprint storage in DB
- ✅ One-click unsubscribe working
- ✅ 500+ email subscribers

**Tasks**:
```
Backend:
  [ ] Set up Supabase table: subscriptions
  [ ] Implement POST /api/subscribe endpoint
  [ ] Implement GET /api/unsubscribe?token=... endpoint
  [ ] Generate signed JWT for unsubscribe links
  [ ] Add input validation (email format, duplicate check)
  [ ] Add rate limiting (max 5 subscriptions per IP per day)

Frontend:
  [ ] Build EmailSignup component
  [ ] Add email input field (with validation)
  [ ] Show success/error toast after submission
  [ ] Add disclaimer text (weekly emails, privacy)

Email Templates:
  [ ] Design welcome email (confirmation + intro to alerts)
  [ ] Design recommendation email (hero model + alternatives)
  [ ] Design retirement/supersession email
  [ ] Test email rendering (Litmus or similar)
  [ ] Create HTML email templates (MJML or similar)

Resend Integration:
  [ ] Create Resend account + API key
  [ ] Configure sender domain (ollamafit@notifications.ollamafit.dev)
  [ ] Set up SPF + DKIM records
  [ ] Test email delivery
  [ ] Monitor bounce rates + spam complaints
```

**Success Criteria**:
- [ ] Email subscription form live on web app
- [ ] 500+ subscribers in first week
- [ ] Email delivery rate 95%+ (not landing in spam)
- [ ] Unsubscribe link works (token verification)

---

#### Week 9-10: Notification Pipeline

**Deliverables**:
- ✅ Weekly cron job that processes model database
- ✅ Sends spec-matched alerts to subscribers
- ✅ Notification analytics (open rate, click rate)
- ✅ Model retirement signals implemented

**Tasks**:
```
Cron Job Implementation:
  [ ] Set up scheduled Node.js function (Supabase Functions or AWS Lambda)
  [ ] Implement database diff logic (compare YAML versions)
  [ ] Implement matching algorithm (fingerprint → new models)
  [ ] Batch email sending (via Resend)
  [ ] Log all notifications sent (for analytics)

Notification Logic:
  [ ] FOR each subscriber:
      [ ] Load their fingerprint
      [ ] FOR each new/updated model:
          [ ] Does it match use case? Y/N
          [ ] Does it fit VRAM? Y/N
          [ ] Is it strictly better than alternatives? Y/N
          [ ] → SEND if all true

Email Content:
  [ ] Subject: "A perfect model for your setup just dropped"
  [ ] Hero: Model name + why it matches
  [ ] CTA: Copy-paste ollama command
  [ ] Secondary: See alternatives link
  [ ] Footer: Unsubscribe link (signed JWT)

Monitoring:
  [ ] Log email sends to notifications_sent table
  [ ] Track open rates (Resend tracks via pixel)
  [ ] Track click rates (UTM parameters)
  [ ] Alert on batch failures (Sentry)
```

**Test Scenarios**:
- [ ] New model added → subscribers with matching GPU notified
- [ ] Model quantization variant added → appropriate subscribers notified
- [ ] Model marked as superseding another → old model users notified
- [ ] Unsubscribe link works (deletes from DB)
- [ ] Duplicate sends prevented (idempotent)

**Success Criteria**:
- [ ] Weekly cron runs successfully (no errors)
- [ ] 3,000+ subscribers by end of week 10
- [ ] Email open rate 15%+ (benchmark: 10-12% for technical)
- [ ] Email click rate 5%+ (users acting on recommendations)

---

#### Week 11-12: Community Database

**Deliverables**:
- ✅ Model database public on GitHub (community PR workflow)
- ✅ 50+ community model contributions
- ✅ Automated validation + merge workflow
- ✅ Community benchmarks collected + surfaced

**Tasks**:
```
GitHub Repository Setup:
  [ ] Create /models directory in GitHub
  [ ] Create models.yaml (40 models verified)
  [ ] Create CONTRIBUTING.md (PR guidelines)
  [ ] Create schema validation script (GitHub Actions)
  [ ] Set up PR template (for new model submissions)

Community Workflow:
  [ ] Document how to submit new model (fork, edit, PR)
  [ ] Implement YAML validation (schema check)
  [ ] Implement model registry verification (HF + Ollama)
  [ ] Implement quantization spec validation
  [ ] Set up auto-merge for valid PRs (after review)

Benchmark Collection:
  [ ] Design benchmark submission format (JSON)
  [ ] Create benchmark table in model YAML schema
  [ ] Implement anonymization (no serial numbers, just GPU model)
  [ ] Create benchmark display (aggregate stats in recommendations)

Incentives:
  [ ] Create "Model Contributor" badge (for 5+ contributions)
  [ ] Public leaderboard of top contributors
  [ ] Shoutout in weekly emails (top contributor)
  [ ] Possible: Discord role for contributors

Marketing:
  [ ] Post in r/ollama: "Help expand the model database"
  [ ] Mention in emails: "Community models now live"
  [ ] Create contributor guide blog post
  [ ] Reach out to model creators (Mistral, Meta, etc.)
```

**Success Criteria**:
- [ ] 50+ community model PRs merged
- [ ] Model database accurate (spot-check 20% of community submissions)
- [ ] GitHub Actions validation runs on every PR
- [ ] Community engagement high (positive PR comments)

---

### Phase 3: Intelligence Layer (Months 4-6)

#### Month 4: Benchmark Submission System

**Deliverables**:
- ✅ CLI --benchmark flag (run inference, collect metrics)
- ✅ Anonymous benchmark submission API
- ✅ 1,000+ community benchmark submissions
- ✅ Real performance data displayed in recommendations

**Tasks**:
```
CLI Benchmark Collection:
  [ ] Implement --benchmark flag (opt-in)
  [ ] Run inference (100 tokens, 3 runs, average)
  [ ] Collect: throughput (tps), latency (ms), temperature
  [ ] Hash GPU serial number (privacy)
  [ ] Create anonymized submission
  [ ] Submit to /api/submit-benchmark endpoint

API Benchmark Storage:
  [ ] Create benchmarks table in Supabase
  [ ] Implement POST /api/submit-benchmark
  [ ] Validate data integrity
  [ ] Deduplicate submissions (same GPU + model + quant)
  [ ] Store aggregates (avg tps, median latency, std dev)

Benchmark Display:
  [ ] Update recommendations to include real data
  [ ] Show: "~98 tok/s (from 12 community reports)"
  [ ] Add confidence score (based on # reports)
  [ ] Show range (min-max from reports)
  [ ] Link to detailed breakdown (by GPU model)

Community Dashboard (Phase 3+):
  [ ] Create public leaderboard (models by speed/quality)
  [ ] Filter by GPU type (RTX 4090, M3 Max, etc.)
  [ ] Show benchmark growth over time
```

**Success Criteria**:
- [ ] 1,000+ benchmark submissions collected
- [ ] 50+ unique hardware configurations
- [ ] Real data displayed in 40%+ of recommendations
- [ ] Confidence scores show aggregation quality

---

#### Month 5: Modelfile Optimizer

**Deliverables**:
- ✅ CLI --optimize-modelfile flag
- ✅ Web app Modelfile optimizer page
- ✅ Generates hardware-tuned suggestions
- ✅ 200+ users of optimizer

**Tasks**:
```
Optimization Algorithm:
  [ ] Parse Modelfile format (parameters section)
  [ ] Detect: context window, temperature, top_k, etc.
  [ ] Map to user's hardware fingerprint
  [ ] Generate suggestions (e.g., "Reduce context window to 2k for speed")
  [ ] Quantify impact (estimated % speed improvement)

CLI Implementation:
  [ ] Implement --optimize-modelfile <path>
  [ ] Read Modelfile from disk
  [ ] Call optimization engine
  [ ] Output suggestions (interactive menu: apply changes? Y/N)
  [ ] Write optimized Modelfile

Web App Implementation:
  [ ] Create paste-Modelfile page
  [ ] Show suggestions visually
  [ ] Generate downloadable optimized Modelfile
  [ ] Show before/after comparison

Integration:
  [ ] Link from recommendations ("Optimize this model for your hardware")
  [ ] Track usage (which suggestions are most popular)
  [ ] Iterate on suggestions based on feedback
```

**Success Criteria**:
- [ ] Optimizer shows clear suggestions
- [ ] 200+ optimizer uses in first month
- [ ] User satisfaction 4.0+ (out of 5)
- [ ] Suggested optimizations validated empirically

---

#### Month 6: Market Leadership

**Deliverables**:
- ✅ 50+ hardware configurations with real benchmark data
- ✅ Competitive positioning: "#1 for Ollama recommendations"
- ✅ 5,000+ total subscribers
- ✅ 10,000+ CLI downloads
- ✅ Established data moat (community benchmarks)

**Tasks**:
```
Market Position:
  [ ] Conduct competitive analysis (vs Reddit, HF, etc.)
  [ ] Create positioning document
  [ ] Write thought leadership blog post ("Quantization demystified")
  [ ] Reach out to industry figures (Ollama, HF, OpenAI)
  [ ] Create benchmark report (published on site)

Community Expansion:
  [ ] Host "Benchmark Day" (ask community to submit)
  [ ] Create Discord community for contributors
  [ ] Monthly contributor recognition (emails, tweets)
  [ ] Possible: T-shirt/swag for top 10 contributors

Metrics & Reporting:
  [ ] Publish metrics dashboard (benchmarks collected, etc.)
  [ ] Monthly recap email (community impact)
  [ ] Blog post: "OllamaFit by the numbers"

Future Roadmap:
  [ ] Plan Phase 4 (fleet management UI)
  [ ] Solicit community feedback (survey)
  [ ] Define v2.0 feature set
```

**Success Criteria**:
- [ ] Recognized by Ollama community as standard tool
- [ ] Benchmark data: 50+ GPU configurations, 200+ model+quant combos
- [ ] User retention: 40%+ of Phase 2 subscribers still active
- [ ] Growth: 20%+ MoM subscriber growth

---

## Part 4: Skills Development & Hiring Timeline

### If Building Lean Team (2 founders)

| Timeline | Skill Needed | Source | Time Invested |
|----------|-------------|--------|----------------|
| **Week 1-2** | Architecture + system design | Existing expertise | 20 hrs |
| **Week 2-4** | React + TypeScript | ✅ Both founders have it | 0 hrs training |
| **Week 4-6** | Go CLI development | Hire Go contractor | 15 hrs supervision |
| **Week 6+** | DevOps/CI-CD | Hire DevOps contractor | 5 hrs/week |
| **Week 1-12** | Community management | Founder B (product) | 40 hrs/week |
| **Week 1-12** | Backend API | Founder A (full-stack) | 40 hrs/week |

**Total Investment**: 2 FT founders + 0.5 FT contractor = $200-300k for Phase 1-2

---

### If Building with External Hires

| Role | Hire Timeline | Cost | Involvement |
|------|---------------|------|------------|
| **Full-Stack Engineer** | Week 1 | $100-150k/yr | Core contributor, CTO track |
| **Go CLI Developer** | Week 2-3 (contractor) | $60-80/hr, 10-15 hrs/week | Contractor for Phase 1-2 |
| **DevOps Engineer** | Week 4 (contractor) | $80-100/hr, 5 hrs/week | Contractor for CI/CD setup |
| **Product Manager** | Week 1 (founder or hire) | Founder role or $80-120k/yr | Strategy, roadmap, community |

**Total Investment**: 1 FT founder + 1 FT engineer + 0.75 FT contractors = $300-400k for Phase 1-2

---

## Part 5: Risk Mitigation & Contingencies

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Model database becomes stale | Medium | Medium | Community PRs + automated alerts for orphaned entries |
| Ollama API breaks | Medium | High | Version compatibility testing + fallback API detection |
| Go binary too large (>100MB) | Low | Low | Strip debug symbols, use UPX compression |
| Recommendation accuracy drops | Low | High | Continuous validation + user feedback surveys |
| Email deliverability issues | Low | Medium | Monitor bounce rates + use reputable sender (Resend) |

### Market Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Ollama pivot away from local AI | Low | High | Forks become relevant, pivot to RunwayML or vLLM |
| Competitor launches similar product | High | Low | Data moat (benchmarks) hard to replicate in <6mo |
| Market consolidation | Low | High | Become feature in larger platform (GitHub Copilot?) |
| User adoption slower than expected | Medium | Medium | Focus on Reddit/Discord communities early |

### Team Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Key person leaves | Medium | High | Hire fast, document everything, cross-train |
| Burnout (2 founders) | High | High | Hire contractors early, delegate, set boundaries |
| Contractor quality issues | Medium | Medium | Hire proven freelancers (Toptal, Gun.io), trial period |

---

## Part 6: Post-Phase 3 Roadmap

### Phase 4: Fleet Management (Q3 2026)
- Web dashboard for managing multiple machines
- Bulk hardware re-fingerprinting
- Bulk model updates across fleet
- Cost analysis per machine

### Phase 5: Fine-Tuning Integration (Q4 2026)
- "Fine-tune this model for your data"
- Integration with Ollama fine-tuning APIs
- Hardware-aware training parameter suggestions

### Phase 6: Marketplace (Q1 2027)
- Sell optimized Modelfiles (creators earn revenue)
- Community-validated Modelfiles
- Paid premium features (fleet analytics, API access)

---

**Document Owner**: Technical Leadership
**Last Updated**: March 18, 2026
**Confidentiality**: Internal Use Only

---

**NEXT STEPS**:
1. ✅ Review tech stack (all agree? any changes?)
2. ✅ Confirm team composition (who's on founding team?)
3. ✅ Greenlight Phase 1 (go/no-go decision)
4. ✅ Schedule weekly syncs (execution cadence)
5. ✅ Create GitHub project board (Week 1 tasks)
