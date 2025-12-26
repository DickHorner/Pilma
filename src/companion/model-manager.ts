import * as fs from 'fs';
import * as path from 'path';
import { ModelConfig, PilmaConfig, validateConfig } from './config';
import { logTrace } from '../tracing/trace';

/**
 * ModelManager handles model download, caching, and lifecycle.
 * For PR2, we implement:
 * - Download/cache path management
 * - Chunking for max token length
 * - Warmup (model preparation)
 * 
 * Note: Actual model inference will be integrated with the Anonymizer
 * in a future iteration. For now, we focus on the infrastructure.
 */

export type ChunkResult = {
  chunks: string[];
  totalChunks: number;
};

export class ModelManager {
  private config: PilmaConfig;
  private loadedModels: Map<string, boolean>; // modelId -> loaded status
  private downloadingModels: Set<string>; // Track models being downloaded

  constructor(config: PilmaConfig) {
    // Validate config at construction time
    validateConfig(config);
    
    this.config = config;
    this.loadedModels = new Map();
    this.downloadingModels = new Set();
    this.ensureCacheDir();
  }

  /**
   * Ensure cache directory exists.
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.config.cacheDir)) {
      fs.mkdirSync(this.config.cacheDir, { recursive: true });
    }
  }

  /**
   * Get model path in cache.
   */
  private getModelPath(modelId: string): string {
    // Convert modelId to filesystem-safe name
    const safeName = modelId.replace(/\//g, '_');
    return path.join(this.config.cacheDir, safeName);
  }

  /**
   * Check if model is cached locally.
   */
  isModelCached(modelId: string): boolean {
    const modelPath = this.getModelPath(modelId);
    return fs.existsSync(modelPath);
  }

  /**
   * Download model from HuggingFace.
   * For PR2, this is a stub that creates a marker file.
   * Actual HuggingFace integration will come later.
   */
  async downloadModel(modelId: string): Promise<void> {
    if (!this.config.allowRemoteDownload) {
      throw new Error('Remote download is not enabled. Set allowRemoteDownload to true in config.');
    }

    // Prevent concurrent downloads of the same model
    if (this.downloadingModels.has(modelId)) {
      throw new Error(`Model ${modelId} is already being downloaded. Please wait.`);
    }

    this.downloadingModels.add(modelId);

    try {
      const traceId = `download-${Date.now()}`;
      const startTime = Date.now();

      logTrace({
        request_id: traceId,
        action: 'model_download_start',
        model_id: modelId,
        started_at: startTime,
      });

      // Create model directory
      const modelPath = this.getModelPath(modelId);
      if (!fs.existsSync(modelPath)) {
        fs.mkdirSync(modelPath, { recursive: true });
      }

      // For PR2: Create a marker file indicating the model is "downloaded"
      // Real implementation would download from HuggingFace API
      const markerPath = path.join(modelPath, 'model.marker');
      fs.writeFileSync(markerPath, JSON.stringify({
        modelId,
        downloadedAt: new Date().toISOString(),
        source: 'stub',
      }), 'utf8');

      const finishTime = Date.now();

      logTrace({
        request_id: traceId,
        action: 'model_download_complete',
        model_id: modelId,
        finished_at: finishTime,
        duration_ms: finishTime - startTime,
      });
    } finally {
      // Always remove from downloading set, even if download fails
      this.downloadingModels.delete(modelId);
    }
  }

  /**
   * Warmup model by loading it into memory.
   * For PR2, this is a stub. Real implementation would load the model
   * using transformers.js or similar.
   */
  async warmupModel(modelId: string): Promise<void> {
    const traceId = `warmup-${Date.now()}`;
    const startTime = Date.now();

    logTrace({
      request_id: traceId,
      action: 'model_warmup_start',
      model_id: modelId,
      started_at: startTime,
    });

    // Check if model is cached
    if (!this.isModelCached(modelId)) {
      if (this.config.allowRemoteDownload) {
        await this.downloadModel(modelId);
      } else {
        throw new Error(`Model ${modelId} is not cached and remote download is disabled.`);
      }
    }

    // Mark as loaded (stub for actual model loading)
    this.loadedModels.set(modelId, true);

    const finishTime = Date.now();

    logTrace({
      request_id: traceId,
      action: 'model_warmup_complete',
      model_id: modelId,
      finished_at: finishTime,
      duration_ms: finishTime - startTime,
    });
  }

  /**
   * Chunk text into segments that fit within model's max token length.
   * Uses a simple heuristic: ~4 characters per token (conservative estimate).
   * Real implementation would use the model's tokenizer.
   */
  chunkText(text: string, maxTokens: number): ChunkResult {
    // Conservative estimate: 4 characters per token
    const charsPerToken = 4;
    const maxChars = maxTokens * charsPerToken;

    if (text.length <= maxChars) {
      return {
        chunks: [text],
        totalChunks: 1,
      };
    }

    const chunks: string[] = [];
    let currentPos = 0;

    while (currentPos < text.length) {
      let endPos = currentPos + maxChars;
      
      // Try to break at sentence boundaries if possible
      if (endPos < text.length) {
        // Look for sentence ending within last 20% of chunk
        const searchStart = endPos - Math.floor(maxChars * 0.2);
        const segment = text.substring(searchStart, endPos);
        const sentenceEnd = segment.search(/[.!?]\s/);
        
        if (sentenceEnd !== -1) {
          endPos = searchStart + sentenceEnd + 1;
        } else {
          // Fall back to word boundary
          const lastSpace = text.lastIndexOf(' ', endPos);
          if (lastSpace > currentPos) {
            endPos = lastSpace + 1;
          }
        }
      }

      chunks.push(text.substring(currentPos, endPos));
      currentPos = endPos;
    }

    return {
      chunks,
      totalChunks: chunks.length,
    };
  }

  /**
   * Get model config for a specific locale and modelId.
   */
  getModelConfig(locale: string, modelId: string): ModelConfig | undefined {
    const models = this.config.locales[locale];
    if (!models) return undefined;
    return models.find(m => m.modelId === modelId);
  }

  /**
   * Get all available locales.
   */
  getAvailableLocales(): string[] {
    return Object.keys(this.config.locales);
  }

  /**
   * Check if a model is loaded in memory.
   */
  isModelLoaded(modelId: string): boolean {
    return this.loadedModels.get(modelId) ?? false;
  }
}
