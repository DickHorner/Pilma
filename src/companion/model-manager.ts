import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PilmaConfig, ModelConfig, validateConfig } from './config';
import { logTrace } from '../tracing/trace';

/**
 * ModelManager handles model download, caching, loading, and chunking.
 * This is a stub implementation for PR2; real HuggingFace integration comes later.
 */
export class ModelManager {
  private config: PilmaConfig;
  private loadedModels: Set<string> = new Set();
  private downloadingModels: Set<string> = new Set();

  constructor(config: PilmaConfig) {
    validateConfig(config);
    this.config = config;
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
   * Get path to cached model file.
   */
  private getCachePath(modelId: string): string {
    const hash = crypto.createHash('sha256').update(modelId).digest('hex').substring(0, 16);
    return path.join(this.config.cacheDir, `${hash}.model`);
  }

  /**
   * Check if model is already cached locally.
   */
  isModelCached(modelId: string): boolean {
    const cachePath = this.getCachePath(modelId);
    return fs.existsSync(cachePath);
  }

  /**
   * Check if model is currently loaded in memory.
   */
  isModelLoaded(modelId: string): boolean {
    return this.loadedModels.has(modelId);
  }

  /**
   * Download model from remote source (stub).
   * In real implementation, this would use HuggingFace Hub API.
   * For PR2, we create a marker file to simulate caching.
   */
  async downloadModel(modelId: string): Promise<void> {
    if (!this.config.models[modelId]) {
      throw new Error(`Model "${modelId}" not found in config`);
    }

    if (!this.config.allowRemoteDownload) {
      throw new Error(
        `Remote download disabled. User must download model "${modelId}" manually.`
      );
    }

    if (this.downloadingModels.has(modelId)) {
      throw new Error(`Model "${modelId}" is already being downloaded`);
    }

    // Mark as downloading synchronously to prevent concurrent downloads
    this.downloadingModels.add(modelId);

    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    logTrace({
      request_id: requestId,
      model_id: modelId,
      action: 'download_start',
      started_at: startTime,
    });

    try {
      // Stub: create marker file to simulate download
      const cachePath = this.getCachePath(modelId);
      fs.writeFileSync(
        cachePath,
        JSON.stringify({
          modelId,
          downloadedAt: new Date().toISOString(),
          stub: true,
        })
      );

      const endTime = Date.now();

      logTrace({
        request_id: requestId,
        model_id: modelId,
        action: 'download_complete',
        started_at: startTime,
        finished_at: endTime,
        duration_ms: endTime - startTime,
      });
    } finally {
      this.downloadingModels.delete(modelId);
    }
  }

  /**
   * Load model into memory (stub).
   * In real implementation, this would load model weights.
   * For PR2, we just mark it as loaded.
   */
  async loadModel(modelId: string): Promise<void> {
    if (!this.isModelCached(modelId)) {
      throw new Error(`Model "${modelId}" not cached. Download it first.`);
    }

    if (this.loadedModels.has(modelId)) {
      return; // Already loaded
    }

    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    logTrace({
      request_id: requestId,
      model_id: modelId,
      action: 'load_start',
      started_at: startTime,
    });

    // Stub: mark as loaded
    this.loadedModels.add(modelId);

    const endTime = Date.now();

    logTrace({
      request_id: requestId,
      model_id: modelId,
      action: 'load_complete',
      started_at: startTime,
      finished_at: endTime,
      duration_ms: endTime - startTime,
    });
  }

  /**
   * Warmup: download (if needed) and load model.
   */
  async warmup(modelId: string): Promise<void> {
    if (!this.config.models[modelId]) {
      throw new Error(`Model "${modelId}" not found in config`);
    }

    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    logTrace({
      request_id: requestId,
      model_id: modelId,
      action: 'warmup_start',
      started_at: startTime,
    });

    try {
      if (!this.isModelCached(modelId)) {
        await this.downloadModel(modelId);
      }

      if (!this.isModelLoaded(modelId)) {
        await this.loadModel(modelId);
      }

      const endTime = Date.now();

      logTrace({
        request_id: requestId,
        model_id: modelId,
        action: 'warmup_complete',
        started_at: startTime,
        finished_at: endTime,
        duration_ms: endTime - startTime,
      });
    } catch (err) {
      const endTime = Date.now();

      logTrace({
        request_id: requestId,
        model_id: modelId,
        action: 'warmup_error',
        started_at: startTime,
        finished_at: endTime,
        duration_ms: endTime - startTime,
      });

      throw err;
    }
  }

  /**
   * Chunk text for short context window models.
   * Uses ~4 chars/token heuristic for DeBERTa.
   * Breaks at sentence/word boundaries when possible.
   */
  chunkText(text: string, modelId: string): string[] {
    const modelConfig = this.config.models[modelId];
    if (!modelConfig) {
      throw new Error(`Model "${modelId}" not found in config`);
    }

    const maxTokens = modelConfig.contextLength;
    const charsPerToken = 4; // Heuristic for DeBERTa
    const maxChars = maxTokens * charsPerToken;

    if (text.length <= maxChars) {
      return [text];
    }

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxChars) {
        chunks.push(remaining);
        break;
      }

      // Try to break at sentence boundary
      let breakPoint = maxChars;
      const sentenceEnd = remaining.lastIndexOf('. ', maxChars);
      if (sentenceEnd > maxChars * 0.5) {
        breakPoint = sentenceEnd + 1; // Include the period
      } else {
        // Try to break at word boundary
        const wordEnd = remaining.lastIndexOf(' ', maxChars);
        if (wordEnd > maxChars * 0.5) {
          breakPoint = wordEnd; // Exclude the space
        }
      }

      chunks.push(remaining.substring(0, breakPoint).trim());
      remaining = remaining.substring(breakPoint).trim();
    }

    return chunks;
  }

  /**
   * Get model configuration.
   */
  getModelConfig(modelId: string): ModelConfig | undefined {
    return this.config.models[modelId];
  }

  /**
   * Get models for a specific locale.
   */
  getModelsForLocale(locale: string): string[] {
    return this.config.localeModels[locale] || [];
  }
}
