# OllamaFit Completion Plan & CLI Injection Strategy

This document outlines the final steps to complete the `OllamaFit` monorepo and implement the requested "CLI Injection" features for seamless Ollama integration.

## Phase 1: End-to-End Integration & Code Cleanup
- **Monorepo Scripts**: Ensure the root `package.json` scripts correctly build the `shared` module before starting the `cli` or `web` tools.
- **Dependency Resolution**: Verify that `cli/` and `web/` properly consume types and logic from `shared/src/engine.ts`.
- **Refactoring & Comments**: Add missing comments to the engine logic (`shared/src/engine.ts`), standardize error handling in the CLI.

## Phase 2: CLI Injection (The "Combine with Ollama" Features)
We will expand the existing `ollama-fit` CLI (`cli/index.ts`) to become a powerful sidekick to the native `ollama` CLI.

1. **Local Sync/Audit (`ollama-fit audit`)**
   - Connects to the local Ollama API (`http://localhost:11434/api/tags`).
   - Retrieves all installed models on your machine.
   - Evaluates them against your current hardware specifications using our recommendation engine.
   - Generates a "Health Report" showing which installed models are optimal, and which might be bottlenecking your system.

2. **Wrapper Mode (`ollama-fit run <model>`)**
   - Acts as an intelligent wrapper around `ollama run`.
   - Before executing, it checks if the requested model fits your hardware.
   - **If optimal**: Silently passes through to `ollama run` and attaches your terminal.
   - **If suboptimal**: Issues a warning (e.g., "Warning: This model requires 14GB VRAM, but you only have 8GB. Continue? [y/N]") before spawning the process.

3. **Alias/Proxy Mode (`ollama-fit install-alias`)**
   - Injects an alias into your shell profile (`.bashrc`, `.zshrc`, etc.): `alias ollama="ollama-fit proxy"`.
   - The `proxy` command intercepts `ollama run` and `ollama pull`, injects our hardware intelligence warnings, and passes all other commands (like `ollama list`, `ollama rm`) transparently to the native `ollama` binary.

## Phase 3: Comprehensive Documentation
- Rewrite the main `README.md` to clearly explain the new CLI capabilities.
- Document how to set up the Alias mode and how to remove it.
- Ensure the project structure is documented so any developer can easily pick up where we left off.
