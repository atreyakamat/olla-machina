# OllamaFit

The **spec-aware model intelligence layer** for Ollama. Find your perfect local model based on your specific hardware, check if your installed models are optimal, and intelligently wrapper the `ollama` CLI to protect you from running models that bottleneck your system.

---

## 🎯 What is OllamaFit?

Ollama is amazing, but with hundreds of models and quantizations, picking the right one for your hardware is a guessing game. OllamaFit solves this by:

1. **Recommending models** that fit perfectly in your VRAM or Unified Memory.
2. **Auditing your currently installed models** to see if they are a good fit.
3. **Acting as an intelligent proxy** for the `ollama run` command, warning you before you run a model that will grind your system to a halt.

---

## 🚀 Features

- **Hardware-Aware**: Automatically detects your GPU (NVIDIA, Apple Silicon), CPU, System RAM, and available VRAM.
- **Quantization Intelligence**: Recommends the optimal quantization level (`Q4`, `Q8`, etc.) for your specific hardware.
- **Hybrid Mode Detection**: Accurately predicts when a model will offload to system RAM and warns you of the speed penalty.
- **CLI Proxy/Injection**: Intercepts `ollama run` and warns you if you are about to run a model that exceeds your system's capabilities.
- **Web App**: A modern React-based UI to browse, filter, and calculate model fits manually.

---

## 🛠️ Project Structure

This is a modern Node.js monorepo:

- `shared/` - Core TypeScript recommendation engine and quantization logic.
- `cli/` - The `ollama-fit` CLI tool (Node.js/TypeScript).
- `web/` - The React web app (Vite + TypeScript + TailwindCSS).
- `api/` - Local Express server for optional backend features (benchmarks).
- `data/` - The community-driven `models.yaml` database.

---

## 💻 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Ollama** (Installed locally on your machine)

### Installation
```bash
# 1. Install dependencies across the entire monorepo
npm install

# 2. Build the shared engine, CLI, and Web App
npm run build

# 3. Link the CLI tool globally
npm link --workspace=cli
```

---

## ⚡ The `ollama-fit` CLI Guide

Once linked, the `ollama-fit` command is available anywhere.

### 1. Recommend a Model
Get the best model recommendations for your specific computer:
```bash
ollama-fit recommend
```

### 2. Audit Installed Models (Local Sync)
Scans the models you have already pulled via Ollama and tells you if they actually fit your hardware:
```bash
ollama-fit audit
```

### 3. Intelligent Run (Wrapper Mode)
Instead of typing `ollama run <model>`, use `ollama-fit run <model>`. It checks your hardware *first*. If the model is too big, it warns you before executing Ollama:
```bash
ollama-fit run llama3.2:70b
```

### 4. Install the Alias (Proxy Mode)
Want this intelligence automatically? Install the alias! This routes your `ollama` commands through `ollama-fit` transparently:
```bash
ollama-fit install-alias
```
*After installing, restart your terminal. Now, typing `ollama run mistral` will automatically perform a hardware safety check first!*

---

## 🌐 Running the Web App

If you prefer a visual interface:
```bash
npm run dev:web
```
Then open `http://localhost:5173` in your browser.

---

## 📄 License
MIT