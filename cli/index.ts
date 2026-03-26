import os from 'os';
import { execSync } from 'child_process';
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
            // Linux - try nvidia-smi
            try {
                const output = execSync('nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits').toString();
                return parseInt(output.trim()) / 1024; // GB
            } catch (e) {
                // No NVIDIA GPU or nvidia-smi failed
            }
        }
    } catch (e) {
        // GPU detection failed
    }
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

program
    .name('ollama-fit')
    .description('Spec-aware model intelligence layer for Ollama')
    .version('1.0.0')
    .option('-j, --json', 'Output results in JSON format')
    .option('-u, --use-case <type>', 'Primary use case (chat, coding, rag, vision, embedding, summarization)', 'chat')
    .option('-p, --priority <level>', 'Speed vs Quality priority (1-5, 1=Speed, 5=Quality)', '3')
    .action((options) => {
        const hardware = getHardwareSpecs();
        const modelsPath = path.join(__dirname, '../data/models.yaml');
        const modelsFile = fs.readFileSync(modelsPath, 'utf8');
        const modelsData = yaml.load(modelsFile);
        const models = parseModelsFromYAML(modelsData);

        const priority = parseInt(options.priority);
        const useCase = options.useCase as UseCase;

        const fingerprintBase: Omit<Fingerprint, 'fingerprint_id'> = {
            created_at: new Date().toISOString(),
            hardware,
            use_case: {
                primary: useCase,
                context_window_min: 4096,
            },
            preferences: {
                speed_vs_quality: priority,
                max_vram_utilization: 0.85,
                single_user: true,
            },
            source: 'cli',
        };

        const fingerprint: Fingerprint = {
            ...fingerprintBase,
            fingerprint_id: generateFingerprintId(fingerprintBase),
        };

        const result = scoreRecommendations(fingerprint, models);

        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log('\n--- OllamaFit Recommendations ---');
            console.log(`Detected: ${hardware.system_ram_gb.toFixed(1)} GB RAM | ${hardware.gpu.vram_gb.toFixed(1)} GB VRAM | ${hardware.os} (${hardware.cpu.architecture})`);
            console.log('---------------------------------\n');

            result.recommendations.forEach((rec, idx) => {
                console.log(`${idx + 1}. ${rec.model_name}:${rec.variant} (${QUANT_LABELS[rec.quantization]})`);
                console.log(`   ${rec.reason}`);
                console.log(`   Pull command: ${rec.ollama_command}\n`);
            });

            if (result.alternatives.length > 0) {
                console.log('Alternatives:');
                result.alternatives.forEach((rec, idx) => {
                    console.log(`   - ${rec.model_name}:${rec.variant} (${QUANT_LABELS[rec.quantization]})`);
                });
                console.log('');
            }
        }
    });

program.parse(process.argv);
