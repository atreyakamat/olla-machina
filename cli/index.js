const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { program } = require('commander');

// Helper to get shared engine
const sharedEnginePath = path.join(__dirname, '../shared/engine.js');
// Since shared engine is currently .ts, I'll write it as a commonjs-compatible .js for now,
// or use a simple transpiler. For this task, I'll just rewrite it as JS in a .js file or copy.
// Let's just create a shared engine in JS to avoid transpilation steps for now.

function getGPUVRAM() {
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

function getHardwareSpecs() {
    const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
    const isAppleSilicon = os.platform() === 'darwin' && os.arch() === 'arm64';
    const vramGB = getGPUVRAM();
    const cpuCores = os.cpus().length;
    const platform = os.platform();

    return {
        totalMemoryGB,
        vramGB,
        isAppleSilicon,
        cpuCores,
        os: platform
    };
}

// Inline shared logic for simplicity in this turn
function getRecommendations(models, specs, prefs) {
    const REVERSE_QUANT_LABELS = {
        "Q4_K_M": "Efficient",
        "Q5_K_M": "Balanced",
        "Q8_0": "Best Quality",
        "F16": "Maximum"
    };

    const recommendations = [];
    const availableGPUMemory = specs.isAppleSilicon ? specs.totalMemoryGB * 0.8 : specs.vramGB;
    const availableSystemMemory = specs.totalMemoryGB;

    for (const model of models) {
        for (const quant of model.quant_levels) {
            const vramNeeded = model.vram_requirements[quant];
            if (!vramNeeded) continue;

            let score = 0;
            let isHybrid = false;
            let reason = "";

            if (vramNeeded <= availableGPUMemory) {
                score = 100 - (vramNeeded / availableGPUMemory) * 10;
                score += (quant === "Q8_0" ? 30 : quant === "Q5_K_M" ? 20 : 10);
                const headroom = (availableGPUMemory - vramNeeded).toFixed(1);
                reason = `Best your ${specs.isAppleSilicon ? "Unified Memory" : "GPU"} can handle with ${headroom} GB headroom.`;
            } else if (vramNeeded <= availableSystemMemory * 0.9) {
                isHybrid = true;
                score = 50 - (vramNeeded / availableSystemMemory) * 20;
                reason = "Hybrid Mode - works with reduced inference speed.";
            } else {
                continue;
            }

            if (prefs.priority === "speed" && quant === "Q4_K_M") score += 20;
            if (prefs.priority === "quality" && quant === "Q8_0") score += 20;
            if (model.use_cases.includes(prefs.useCase)) score += 25;

            recommendations.push({
                model,
                quant,
                label: REVERSE_QUANT_LABELS[quant],
                score,
                vramUsage: vramNeeded,
                isHybrid,
                reason
            });
        }
    }

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
}

program
    .name('ollama-recommend')
    .description('Recommends the best local models based on your hardware specs')
    .version('1.0.0')
    .option('-j, --json', 'Output results in JSON format')
    .option('-u, --use-case <type>', 'Primary use case (chat, coding, reasoning, summarization, general)', 'general')
    .option('-p, --priority <priority>', 'Speed vs Quality priority (speed, quality, balanced)', 'balanced')
    .action((options) => {
        const specs = getHardwareSpecs();
        const modelsPath = path.join(__dirname, '../data/models.yaml');
        const modelsFile = fs.readFileSync(modelsPath, 'utf8');
        const models = yaml.load(modelsFile);

        const prefs = {
            useCase: options.useCase,
            priority: options.priority
        };

        const recs = getRecommendations(models, specs, prefs);

        if (options.json) {
            console.log(JSON.stringify({ specs, recommendations: recs }, null, 2));
        } else {
            console.log('\n--- OllamaFit Recommendations ---');
            console.log(`Detected: ${specs.totalMemoryGB.toFixed(1)} GB RAM | ${specs.vramGB.toFixed(1)} GB VRAM | ${specs.isAppleSilicon ? 'Apple Silicon' : specs.os}`);
            console.log('---------------------------------\n');

            recs.forEach((rec, idx) => {
                console.log(`${idx + 1}. ${rec.model.name}:${rec.model.variant} (${rec.label})`);
                console.log(`   ${rec.reason}`);
                console.log(`   Pull command: ${rec.model.ollama_pull_command}\n`);
            });
        }
    });

program.parse(process.argv);
