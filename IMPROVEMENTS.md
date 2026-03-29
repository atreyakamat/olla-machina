# OllamaFit Improvements & Roadmap

This document outlines the planned improvements and roadmap for OllamaFit, focusing on enhancing user experience, accuracy, and performance.

## 1. UI/UX Enhancements
- [x] **Glassmorphism Overhaul**: Implement a modern, fluid glassmorphic design for the landing page and checker tool.
- [x] **Chibi Characters**: Add animated "Olla" and "Machina" chibi characters to make the landing page more engaging.
- [x] **Hardware Icons**: Integrate SVG icons for GPU, VRAM, RAM, and Storage in recommendation cards.
- [ ] **Dark/Light Mode**: Add a toggle for switching between dark and light themes.
- [ ] **Interactive Onboarding**: Create a guided walkthrough for new users to understand how to use the tool.

## 2. Recommendation Engine Accuracy
- [x] **Storage Awareness**: Factor in disk space requirements for models to prevent "Disk Full" errors during download.
- [x] **Real-world Benchmarks**: Integrate community-driven benchmark data to provide more accurate performance (TPS) estimates.
- [ ] **Dynamic Overlays**: Calculate real-time VRAM overhead based on common OS background tasks (e.g., Windows DWM).
- [ ] **Context Window Scaling**: Adjust VRAM requirements based on the requested context window size (KV cache scaling).

## 3. Local API & Integration
- [x] **SQLite Backend**: Implement a local SQLite-backed Express API for managing subscriptions and benchmarks.
- [ ] **Ollama API Integration**: Connect directly to the local Ollama instance (if running) to auto-detect current models and hardware.
- [ ] **Export to Config**: Allow users to export recommendations as a Modelfile or an Ollama config snippet.

## 4. Testing & Validation
- [x] **Core Logic Tests**: Ensure the recommendation engine logic is verified with unit tests.
- [ ] **Visual Regression Testing**: Implement tests to ensure UI changes don't break existing layouts.
- [ ] **Hardware Compatibility Matrix**: Create a broader test suite covering various GPU architectures (NVIDIA, AMD, Apple Silicon).

## 5. Community & Data
- [ ] **Leaderboard**: Add a leaderboard for the most popular models for specific hardware profiles.
- [ ] **Community Comments**: Allow users to leave comments and tips on specific model/quantization pairs.
- [ ] **API Documentation**: Provide a public API (optional) for other tools to fetch model recommendation data.
