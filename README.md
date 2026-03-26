# OllamaFit

Spec-aware model intelligence layer for Ollama. Find your perfect local model based on your hardware.

## Project Structure

- `shared/` - Shared recommendation engine and types (TypeScript/ESM)
- `web/` - React web app (Vite + TypeScript)
- `cli/` - CLI tool for local hardware detection and model recommendations (Node.js/TypeScript)
- `data/` - Model database (YAML)
- `supabase/` - Database schema for subscriptions and benchmarks

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- Ollama (installed locally for CLI use)

### Installation

```bash
npm install
```

### Running the CLI

```bash
cd cli
npm start
```

### Running the Web App

```bash
cd web
npm run dev
```

### Running Tests

```bash
npm test
```

## Features

- **Hardware-Aware**: Automatically detects GPU (NVIDIA, Apple Silicon, AMD), CPU, and RAM.
- **Quantization Intelligence**: Recommends the optimal quantization level for your specific VRAM.
- **Hybrid Mode**: Detects when a model can run across GPU and System RAM.
- **Spec-Matched Alerts**: (Phase 2) Subscribe to get notified when better models for your setup are released.

## License

MIT
