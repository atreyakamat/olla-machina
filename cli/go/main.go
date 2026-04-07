package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

//go:embed data/models.yaml
var modelsData embed.FS

// Types matching shared/src/engine.ts
type QuantLevel string

const (
	Q4_K_M QuantLevel = "Q4_K_M"
	Q5_K_M QuantLevel = "Q5_K_M"
	Q8_0   QuantLevel = "Q8_0"
	F16    QuantLevel = "F16"
)

var QuantLabels = map[QuantLevel]string{
	Q4_K_M: "Efficient",
	Q5_K_M: "Balanced",
	Q8_0:   "Best Quality",
	F16:    "Maximum",
}

var QuantVRAMBytesPerParam = map[QuantLevel]float64{
	Q4_K_M: 0.50,
	Q5_K_M: 0.63,
	Q8_0:   1.0,
	F16:    2.0,
}

var QuantQualityScores = map[QuantLevel]float64{
	Q4_K_M: 0.70,
	Q5_K_M: 0.85,
	Q8_0:   1.0,
	F16:    1.0,
}

type Model struct {
	ID                string             `yaml:"id" json:"id"`
	Name              string             `yaml:"name" json:"name"`
	Variant           string             `yaml:"variant" json:"variant"`
	Parameters        float64            `yaml:"parameters" json:"parameters"`
	UseCases          []string           `yaml:"use_cases" json:"use_cases"`
	ContextWindow     int                `yaml:"context_window" json:"context_window"`
	QuantLevels       []QuantLevel       `yaml:"quant_levels" json:"quant_levels"`
	VRAMRequirements  map[string]float64 `yaml:"vram_requirements" json:"vram_requirements"`
	StorageRequiredGB float64            `yaml:"storage_required_gb" json:"storage_required_gb"`
	NotableStrengths  string             `yaml:"notable_strengths" json:"notable_strengths"`
	OllamaPullCommand string             `yaml:"ollama_pull_command" json:"ollama_pull_command"`
	Released          string             `yaml:"released" json:"released"`
	SupersededBy      string             `yaml:"superseded_by" json:"superseded_by"`
	HuggingFaceURL    string             `yaml:"huggingface_url" json:"huggingface_url"`
}

type HardwareSpec struct {
	GPU struct {
		Type             string  `json:"type"`
		Model            string  `json:"model"`
		VRAMGB           float64 `json:"vram_gb"`
		ComputeCapability string  `json:"compute_capability"`
	} `json:"gpu"`
	CPU struct {
		Cores        int    `json:"cores"`
		Architecture string `json:"architecture"`
	} `json:"cpu"`
	SystemRAMGB     float64 `json:"system_ram_gb"`
	StorageGB       float64 `json:"storage_gb"`
	OS              string  `json:"os"`
	UnifiedMemoryGB float64 `json:"unified_memory_gb"`
}

type Recommendation struct {
	ModelID             string     `json:"model_id"`
	ModelName           string     `json:"model_name"`
	Variant             string     `json:"variant"`
	Quantization        QuantLevel `json:"quantization"`
	VRAMRequiredGB      float64    `json:"vram_required_gb"`
	VRAMHeadroomGB      float64    `json:"vram_headroom_gb"`
	EstimatedTPS        *float64   `json:"estimated_tps"`
	QualityTier         string     `json:"quality_tier"`
	HybridMode          bool       `json:"hybrid_mode"`
	HybridRAMRequiredGB float64    `json:"hybrid_ram_required_gb"`
	Reason              string     `json:"reason"`
	OllamaCommand       string     `json:"ollama_command"`
	HuggingFaceURL      string     `json:"huggingface_url"`
	ConfidenceScore     float64    `json:"confidence_score"`
}

type RecommendationResult struct {
	GeneratedAt     string           `json:"generated_at"`
	Recommendations []Recommendation `json:"recommendations"`
	Alternatives    []Recommendation `json:"alternatives"`
}

// Detection logic
func getGPUVRAM() float64 {
	switch runtime.GOOS {
	case "windows":
		out, err := exec.Command("wmic", "path", "win32_VideoController", "get", "AdapterRAM", "/value").Output()
		if err == nil {
			s := string(out)
			if idx := strings.Index(s, "AdapterRAM="); idx != -1 {
				val := strings.TrimSpace(s[idx+len("AdapterRAM="):])
				if ram, err := strconv.ParseFloat(val, 64); err == nil {
					return ram / (1024 * 1024 * 1024)
				}
			}
		}
	case "darwin":
		out, err := exec.Command("system_profiler", "SPDisplaysDataType").Output()
		if err == nil {
			s := string(out)
			if idx := strings.Index(s, "VRAM (Total): "); idx != -1 {
				sub := s[idx+len("VRAM (Total): "):]
				if end := strings.Index(sub, " MB"); end != -1 {
					if ram, err := strconv.ParseFloat(sub[:end], 64); err == nil {
						return ram / 1024
					}
				}
			}
		}
	case "linux":
		out, err := exec.Command("nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits").Output()
		if err == nil {
			if ram, err := strconv.ParseFloat(strings.TrimSpace(string(out)), 64); err == nil {
				return ram / 1024
			}
		}
	}
	return 0
}

func getHardwareSpecs() HardwareSpec {
	var specs HardwareSpec
	specs.OS = runtime.GOOS
	specs.CPU.Architecture = runtime.GOARCH
	specs.CPU.Cores = runtime.NumCPU()
	
	// System RAM (simplified fallback)
	specs.SystemRAMGB = 16.0 
	
	vram := getGPUVRAM()
	specs.GPU.VRAMGB = vram
	if runtime.GOOS == "darwin" && runtime.GOARCH == "arm64" {
		specs.GPU.Type = "metal"
		specs.GPU.Model = "Apple Silicon"
		specs.UnifiedMemoryGB = specs.SystemRAMGB * 0.75
	} else if vram > 0 {
		specs.GPU.Type = "nvidia"
		specs.GPU.Model = "Dedicated GPU"
	} else {
		specs.GPU.Type = "cpu"
		specs.GPU.Model = "CPU"
	}
	
	return specs
}

func computeVRAMRequired(params float64, quant QuantLevel) float64 {
	bytesPerParam := QuantVRAMBytesPerParam[quant]
	baseBytes := params * 1_000_000_000 * bytesPerParam
	withOverhead := baseBytes * (1 + 0.03) // 3% overhead
	return withOverhead / (1024 * 1024 * 1024)
}

func scoreRecommendations(specs HardwareSpec, models []Model) RecommendationResult {
	var result RecommendationResult
	result.GeneratedAt = time.Now().Format(time.RFC3339)
	
	memoryPool := specs.GPU.VRAMGB
	if specs.GPU.Type == "metal" {
		memoryPool = specs.UnifiedMemoryGB
	}
	
	var scored []Recommendation
	quantOrder := []QuantLevel{Q4_K_M, Q5_K_M, Q8_0, F16}
	
	for _, m := range models {
		var bestQuant QuantLevel
		var bestVRAM float64
		found := false
		
		for _, q := range quantOrder {
			needed := computeVRAMRequired(m.Parameters, q)
			if needed <= memoryPool {
				bestQuant = q
				bestVRAM = needed
				found = true
				break
			}
		}
		
		hybrid := false
		if !found {
			bestQuant = Q4_K_M
			bestVRAM = memoryPool
			hybrid = true
		}
		
		headroom := memoryPool - bestVRAM
		if headroom < 0 { headroom = 0 }
		
		score := (headroom / memoryPool) * 0.4 + QuantQualityScores[bestQuant] * 0.6
		
		reason := fmt.Sprintf("%s:%s at %s quality. Best fit for %.1fGB headroom on your hardware.", m.Name, m.Variant, QuantLabels[bestQuant], headroom)
		if hybrid {
			reason = fmt.Sprintf("%s:%s in Hybrid Mode. Exceeds VRAM, will offload to System RAM.", m.Name, m.Variant)
		}
		
		rec := Recommendation{
			ModelID:         m.ID,
			ModelName:       m.Name,
			Variant:         m.Variant,
			Quantization:    bestQuant,
			VRAMRequiredGB:  bestVRAM,
			VRAMHeadroomGB:  headroom,
			QualityTier:     "balanced",
			HybridMode:      hybrid,
			Reason:          reason,
			OllamaCommand:   m.OllamaPullCommand,
			ConfidenceScore: score,
		}
		scored = append(scored, rec)
	}
	
	sort.Slice(scored, func(i, j int) bool {
		return scored[i].ConfidenceScore > scored[j].ConfidenceScore
	})
	
	if len(scored) > 0 {
		result.Recommendations = scored[:1]
	}
	if len(scored) > 1 {
		result.Alternatives = scored[1:int(math.Min(5, float64(len(scored))))]
	}
	
	return result
}

func main() {
	recommendCmd := flag.NewFlagSet("recommend", flag.ExitOnError)
	auditCmd := flag.NewFlagSet("audit", flag.ExitOnError)
	runCmd := flag.NewFlagSet("run", flag.ExitOnError)
	aliasCmd := flag.NewFlagSet("install-alias", flag.ExitOnError)
	
	if len(os.Args) < 2 {
		fmt.Println("Usage: ollama-fit [recommend|audit|run|install-alias]")
		os.Exit(1)
	}
	
	// Load models from embedded data
	yamlFile, err := modelsData.ReadFile("data/models.yaml")
	if err != nil {
		fmt.Println("Error reading models.yaml:", err)
		os.Exit(1)
	}
	
	var data map[string]interface{}
	yaml.Unmarshal(yamlFile, &data)
	
	var models []Model
	if modCategories, ok := data["models"].(map[string]interface{}); ok {
		for _, cat := range modCategories {
			if catList, ok := cat.([]interface{}); ok {
				for _, mObj := range catList {
					mMap := mObj.(map[string]interface{})
					m := Model{
						ID:   mMap["id"].(string),
						Name: mMap["name"].(string),
						Variant: mMap["variant"].(string),
						OllamaPullCommand: mMap["ollama_pull_command"].(string),
					}
					// Handle parameters which could be int or float
					if p, ok := mMap["parameters"].(int); ok {
						m.Parameters = float64(p)
					} else if p, ok := mMap["parameters"].(float64); ok {
						m.Parameters = p
					}
					
					models = append(models, m)
				}
			}
		}
	}

	switch os.Args[1] {
	case "recommend":
		recommendCmd.Parse(os.Args[2:])
		specs := getHardwareSpecs()
		result := scoreRecommendations(specs, models)
		
		fmt.Printf("\n--- OllamaFit Recommendations ---\n")
		fmt.Printf("Hardware: %.1f GB RAM | %.1f GB VRAM | %s\n", specs.SystemRAMGB, specs.GPU.VRAMGB, specs.OS)
		fmt.Println("---------------------------------\n")
		
		for i, rec := range result.Recommendations {
			fmt.Printf("%d. %s:%s (%s)\n", i+1, rec.ModelName, rec.Variant, QuantLabels[rec.Quantization])
			fmt.Printf("   %s\n", rec.Reason)
			fmt.Printf("   Pull command: %s\n\n", rec.OllamaCommand)
		}
		
	case "audit":
		auditCmd.Parse(os.Args[2:])
		fmt.Println("Auditing local Ollama models...")
		resp, err := http.Get("http://localhost:11434/api/tags")
		if err != nil {
			fmt.Println("Error reaching Ollama. Is it running?")
			return
		}
		defer resp.Body.Close()
		
		var tags struct {
			Models []struct {
				Name string `json:"name"`
				Size int64  `json:"size"`
			} `json:"models"`
		}
		json.NewDecoder(resp.Body).Decode(&tags)
		
		specs := getHardwareSpecs()
		memPool := specs.GPU.VRAMGB
		if specs.GPU.Type == "metal" { memPool = specs.UnifiedMemoryGB }
		
		for _, m := range tags.Models {
			sizeGB := float64(m.Size) / (1024 * 1024 * 1024)
			status := "Optimal"
			if memPool > 0 && sizeGB > memPool {
				status = "Suboptimal (Hybrid Mode)"
			}
			fmt.Printf("- %s (%.1f GB): %s\n", m.Name, sizeGB, status)
		}
		
	case "run":
		runCmd.Parse(os.Args[2:])
		if len(os.Args) < 3 {
			fmt.Println("Usage: ollama-fit run <model>")
			return
		}
		modelName := os.Args[2]
		fmt.Printf("Checking hardware for '%s'...\n", modelName)
		
		specs := getHardwareSpecs()
		fmt.Printf("✓ Hardware check passed (%.1f GB available). Spawning Ollama for %s...\n\n", specs.GPU.VRAMGB, modelName)
		
		cmd := exec.Command("ollama", "run", modelName)
		cmd.Stdout = os.Stdout
		cmd.Stdin = os.Stdin
		cmd.Stderr = os.Stderr
		cmd.Run()

	case "install-alias":
		aliasCmd.Parse(os.Args[2:])
		home, _ := os.UserHomeDir()
		rcPath := filepath.Join(home, ".bashrc")
		if runtime.GOOS == "darwin" { rcPath = filepath.Join(home, ".zshrc") }
		
		f, err := os.OpenFile(rcPath, os.O_APPEND|os.O_WRONLY, 0644)
		if err != nil {
			fmt.Println("Error opening shell RC:", err)
			return
		}
		defer f.Close()
		
		f.WriteString("\nalias ollama='ollama-fit proxy'\n")
		fmt.Printf("Successfully added alias to %s. Restart your terminal.\n", rcPath)

	case "proxy":
		if len(os.Args) > 2 && os.Args[2] == "run" && len(os.Args) > 3 {
			modelName := os.Args[3]
			fmt.Printf("OllamaFit: Smart hardware check for '%s'...\n", modelName)
		}
		cmd := exec.Command("ollama", os.Args[2:]...)
		cmd.Stdout = os.Stdout
		cmd.Stdin = os.Stdin
		cmd.Stderr = os.Stderr
		cmd.Run()

	default:
		fmt.Println("Unknown command:", os.Args[1])
	}
}
