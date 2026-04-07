import os from 'os';
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { program } from 'commander';
import { fileURLToPath } from 'url';

import { 
  scoreRecommendations, 
  parseModelsFromYAML,
  QUANT_LABELS,
  generateFingerprintId
} from '../shared/src/engine';

import type { 
  Model, 
  HardwareSpec, 
  UseCase, 
  Fingerprint,
  OS
} from '../shared/src/engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGPUVRAM(): number {
    try {
        if (os.platform() === 'win32') {
            const output = execSync('wmic path win32_VideoController get AdapterRAM /value').toString();
            const ramMatch = output.match(/AdapterRAM=(\d+)/);
            if (ramMatch) {
                return parseInt(ramMatch[1]) / (1024 * 1024 * 1024); // GB
            }
        } else if (os.platform() === 'darwin') {
            const output = execSync('system_profiler SPDisplaysDataType').toString();
            const vramMatch = output.match(/VRAM \(Total\): (\d+) MB/);
            if (vramMatch) {
                return parseInt(vramMatch[1]) / 1024; // GB
            }
        } else {
            try {
                const output = execSync('nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits').toString();
                return parseInt(output.trim()) / 1024; // GB
            } catch (e) {}
        }
    } catch (e) {}
    return 0;
}

function getHardwareSpecs(): HardwareSpec {
    const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
    const isAppleSilicon = os.platform() === 'darwin' && os.arch() === 'arm64';
    const vramGB = getGPUVRAM();
    const cpuCores = os.cpus().length;
    const platform = os.platform();

    let mappedOS: OS = 'Linux';
    if (platform === 'darwin') mappedOS = 'macOS';
    if (platform === 'win32') mappedOS = 'Windows';

    return {
        gpu: {
            type: isAppleSilicon ? 'metal' : (vramGB > 0 ? 'nvidia' : 'cpu'),
            model: isAppleSilicon ? 'Apple Silicon' : (vramGB > 0 ? 'Dedicated GPU' : 'CPU'),
            vram_gb: vramGB || 0,
        },
        cpu: {
            cores: cpuCores,
            architecture: os.arch() === 'arm64' ? 'arm64' : 'x86_64',
        },
        system_ram_gb: totalMemoryGB,
        os: mappedOS,
        unified_memory_gb: isAppleSilicon ? totalMemoryGB * 0.75 : undefined,
    };
}

function loadModels() {
    const modelsPath = path.join(__dirname, '../data/models.yaml');
    const modelsFile = fs.readFileSync(modelsPath, 'utf8');
    const modelsData = yaml.load(modelsFile);
    return parseModelsFromYAML(modelsData);
}

function getRecommendation(modelName: string) {
    const hardware = getHardwareSpecs();
    const models = loadModels();
    
    const fingerprintBase: Omit<Fingerprint, 'fingerprint_id'> = {
        created_at: new Date().toISOString(),
        hardware,
        use_case: { primary: 'chat', context_window_min: 4096 },
        preferences: { speed_vs_quality: 3, max_vram_utilization: 0.85, single_user: true },
        source: 'cli',
    };
    const fingerprint: Fingerprint = {
        ...fingerprintBase,
        fingerprint_id: generateFingerprintId(fingerprintBase),
    };

    const result = scoreRecommendations(fingerprint, models);
    return { hardware, result };
}

program
    .name('ollama-fit')
    .description('Spec-aware model intelligence layer for Ollama')
    .version('1.0.0');

// Default command (Recommend)
program
    .command('recommend', { isDefault: true })
    .description('Get model recommendations based on your hardware')
    .option('-j, --json', 'Output results in JSON format')
    .option('-u, --use-case <type>', 'Primary use case', 'chat')
    .option('-p, --priority <level>', 'Speed vs Quality priority', '3')
    .action((options) => {
        const { hardware, result } = getRecommendation(''); // base recommendation
        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log('\n--- OllamaFit Recommendations ---');
            console.log(`Detected: ${hardware.system_ram_gb.toFixed(1)} GB RAM | ${hardware.gpu.vram_gb.toFixed(1)} GB VRAM | ${hardware.os} (${hardware.cpu.architecture})`);
            console.log('---------------------------------\n');

            result.recommendations.forEach((rec, idx) => {
                console.log(`${idx + 1}. ${rec.model_name}:${rec.variant} (${QUANT_LABELS[rec.quantization] || rec.quantization})`);
                console.log(`   ${rec.reason}`);
                console.log(`   Pull command: ${rec.ollama_command}\n`);
            });
            if (result.alternatives.length > 0) {
                console.log('Alternatives:');
                result.alternatives.forEach((rec) => {
                    console.log(`   - ${rec.model_name}:${rec.variant} (${QUANT_LABELS[rec.quantization] || rec.quantization})`);
                });
                console.log('');
            }
        }
    });

// Audit command
program
    .command('audit')
    .description('Audit locally installed Ollama models against your hardware')
    .action(async () => {
        console.log('Auditing installed Ollama models...\n');
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            if (!response.ok) throw new Error('Failed to reach Ollama');
            const data = await response.json();
            const models = data.models || [];
            
            const hardware = getHardwareSpecs();
            console.log(`Hardware: ${hardware.system_ram_gb.toFixed(1)} GB RAM | ${hardware.gpu.vram_gb.toFixed(1)} GB VRAM\n`);

            for (const m of models) {
                const sizeGB = m.size / (1024 * 1024 * 1024);
                const memoryPool = hardware.gpu.type === 'metal' ? (hardware.unified_memory_gb || hardware.system_ram_gb * 0.75) : hardware.gpu.vram_gb;
                
                let status = '\x1b[32mOptimal\x1b[0m'; // Green
                let msg = `Fits comfortably in memory.`;
                
                if (memoryPool === 0 && sizeGB > hardware.system_ram_gb * 0.8) {
                    status = '\x1b[31mPoor Fit\x1b[0m'; // Red
                    msg = `Exceeds safe system RAM threshold.`;
                } else if (memoryPool > 0 && sizeGB > memoryPool) {
                    status = '\x1b[33mSuboptimal (Hybrid Mode)\x1b[0m'; // Yellow
                    msg = `Exceeds VRAM (${sizeGB.toFixed(1)}GB > ${memoryPool.toFixed(1)}GB). Will offload to system RAM.`;
                }

                console.log(`Model: ${m.name}`);
                console.log(`Size:  ${sizeGB.toFixed(1)} GB | Quant: ${m.details?.quantization_level || 'Unknown'}`);
                console.log(`Fit:   ${status} - ${msg}\n`);
            }
        } catch (e: any) {
            console.log('\x1b[31mError connecting to Ollama. Is it running? (http://localhost:11434)\x1b[0m');
        }
    });

// Run Wrapper command
program
    .command('run <model>')
    .description('Intelligently run a model, checking hardware compatibility first')
    .action(async (modelName) => {
        try {
            const response = await fetch('http://localhost:11434/api/show', {
                method: 'POST',
                body: JSON.stringify({ name: modelName })
            });
            if (!response.ok) {
                // If model not found locally, just let native ollama handle the error/pull
                console.log(`\x1b[36mOllamaFit:\x1b[0m Model '${modelName}' not found locally. Passing to Ollama...`);
                spawnSync('ollama', ['run', modelName], { stdio: 'inherit' });
                return;
            }

            const data = await response.json();
            const sizeGB = data.details?.parameter_size ? parseInt(data.details.parameter_size) * 0.7 : 0; // rough heuristic if size not direct
            const hardware = getHardwareSpecs();
            const memoryPool = hardware.gpu.type === 'metal' ? (hardware.unified_memory_gb || hardware.system_ram_gb * 0.75) : hardware.gpu.vram_gb;
            
            // Simple heuristic warning
            let warning = false;
            if (memoryPool > 0 && sizeGB > memoryPool) {
                console.log(`\x1b[33m⚠️ WARNING: '${modelName}' may exceed your VRAM (${sizeGB.toFixed(1)}GB > ${memoryPool.toFixed(1)}GB).\x1b[0m`);
                warning = true;
            } else if (memoryPool === 0 && sizeGB > hardware.system_ram_gb * 0.8) {
                console.log(`\x1b[31m⚠️ WARNING: '${modelName}' may exceed safe system RAM limits.\x1b[0m`);
                warning = true;
            }

            if (warning) {
                console.log('It will likely run slowly using system memory (Hybrid Mode).');
                console.log('Press Ctrl+C within 3 seconds to cancel, or wait to continue...\n');
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                console.log(`\x1b[32m✓ Hardware check passed for ${modelName}\x1b[0m\n`);
            }

            spawnSync('ollama', ['run', modelName], { stdio: 'inherit' });
        } catch (e: any) {
            // Fallback to native
            spawnSync('ollama', ['run', modelName], { stdio: 'inherit' });
        }
    });

// Alias proxy installer
program
    .command('install-alias')
    .description('Install a shell alias to route "ollama" commands through ollama-fit')
    .action(() => {
        const shell = process.env.SHELL || '';
        let rcFile = '';
        if (shell.includes('zsh')) rcFile = '.zshrc';
        else if (shell.includes('bash')) rcFile = '.bashrc';
        else {
            console.log('Unsupported shell. Please manually add: alias ollama="ollama-fit proxy"');
            return;
        }

        const rcPath = path.join(os.homedir(), rcFile);
        const aliasCmd = `\nalias ollama="ollama-fit proxy"\n`;
        
        try {
            fs.appendFileSync(rcPath, aliasCmd);
            console.log(`\x1b[32mSuccessfully added alias to ${rcPath}\x1b[0m`);
            console.log('Please restart your terminal or run:');
            console.log(`source ~/${rcFile}`);
        } catch (e) {
            console.log(`Failed to write to ${rcPath}`);
        }
    });

// Proxy command (Internal use)
program
    .command('proxy [args...]')
    .description('Internal proxy command for the shell alias')
    .action((args) => {
        if (!args || args.length === 0) {
            spawnSync('ollama', [], { stdio: 'inherit' });
            return;
        }

        const cmd = args[0];
        if (cmd === 'run' && args[1]) {
            // Re-route to our smart run
            const modelName = args[1];
            spawnSync(process.argv[0], [process.argv[1], 'run', modelName], { stdio: 'inherit' });
        } else {
            // Pass through
            spawnSync('ollama', args, { stdio: 'inherit' });
        }
    });

program.parse(process.argv);
