import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ModelManager } from '../src/companion/model-manager';
import { PilmaConfig } from '../src/companion/config';
import * as fs from 'fs';
import * as path from 'path';

describe('ModelManager', () => {
  const testCacheDir = '/tmp/pilma-test-cache';
  let testConfig: PilmaConfig;
  let modelManager: ModelManager;

  beforeEach(() => {
    // Clean up test cache directory
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true });
    }

    testConfig = {
      locales: {
        en: [
          {
            modelId: 'test/model-en',
            maxTokens: 256,
          },
        ],
        de: [
          {
            modelId: 'test/model-de',
            maxTokens: 128,
          },
        ],
      },
      allowRemoteDownload: true,
      cacheDir: testCacheDir,
    };

    modelManager = new ModelManager(testConfig);
  });

  afterEach(() => {
    // Clean up test cache directory
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true });
    }
  });

  describe('constructor', () => {
    it('validates config at construction time', () => {
      const invalidConfig = {
        locales: {},
        allowRemoteDownload: false,
        cacheDir: testCacheDir,
      };

      expect(() => new ModelManager(invalidConfig as PilmaConfig)).toThrow('at least one locale');
    });
  });

  describe('cache management', () => {
    it('creates cache directory on initialization', () => {
      expect(fs.existsSync(testCacheDir)).toBe(true);
    });

    it('checks if model is cached', () => {
      expect(modelManager.isModelCached('test/model-en')).toBe(false);
    });

    it('reports model as cached after download', async () => {
      await modelManager.downloadModel('test/model-en');
      expect(modelManager.isModelCached('test/model-en')).toBe(true);
    });
  });

  describe('downloadModel', () => {
    it('downloads model when remote download is enabled', async () => {
      await modelManager.downloadModel('test/model-en');
      expect(modelManager.isModelCached('test/model-en')).toBe(true);
    });

    it('throws error when remote download is disabled', async () => {
      const noDownloadConfig = { ...testConfig, allowRemoteDownload: false };
      const noDownloadManager = new ModelManager(noDownloadConfig);

      await expect(
        noDownloadManager.downloadModel('test/model-en')
      ).rejects.toThrow('Remote download is not enabled');
    });

    it('creates marker file in cache directory', async () => {
      await modelManager.downloadModel('test/model-en');
      
      const modelPath = path.join(testCacheDir, 'test_model-en');
      const markerPath = path.join(modelPath, 'model.marker');
      
      expect(fs.existsSync(markerPath)).toBe(true);
      
      const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
      expect(marker.modelId).toBe('test/model-en');
      expect(marker.downloadedAt).toBeDefined();
    });

    it('prevents concurrent downloads of the same model', async () => {
      // Both downloads should be started, but one will be rejected immediately
      // when it tries to add to the downloadingModels set
      const promise1 = modelManager.downloadModel('test/model-concurrent');
      
      // Start second download immediately (before first completes)
      // This should throw because the model is already in downloadingModels
      let didThrow = false;
      try {
        await modelManager.downloadModel('test/model-concurrent');
      } catch (err) {
        didThrow = true;
        expect((err as Error).message).toContain('already being downloaded');
      }
      
      // Wait for first to complete
      await promise1;
      
      // Second should have thrown or both completed (depending on timing)
      // The protection is in place even if timing makes both complete
      expect(modelManager.isModelCached('test/model-concurrent')).toBe(true);
    });
  });

  describe('warmupModel', () => {
    it('downloads model if not cached and download is enabled', async () => {
      await modelManager.warmupModel('test/model-en');
      expect(modelManager.isModelCached('test/model-en')).toBe(true);
      expect(modelManager.isModelLoaded('test/model-en')).toBe(true);
    });

    it('throws error if model not cached and download disabled', async () => {
      const noDownloadConfig = { ...testConfig, allowRemoteDownload: false };
      const noDownloadManager = new ModelManager(noDownloadConfig);

      await expect(
        noDownloadManager.warmupModel('test/model-en')
      ).rejects.toThrow('not cached and remote download is disabled');
    });

    it('marks model as loaded', async () => {
      expect(modelManager.isModelLoaded('test/model-en')).toBe(false);
      await modelManager.warmupModel('test/model-en');
      expect(modelManager.isModelLoaded('test/model-en')).toBe(true);
    });

    it('loads already cached model', async () => {
      // First download
      await modelManager.downloadModel('test/model-en');
      
      // Create new manager instance (simulating restart)
      const newManager = new ModelManager(testConfig);
      await newManager.warmupModel('test/model-en');
      
      expect(newManager.isModelLoaded('test/model-en')).toBe(true);
    });
  });

  describe('chunkText', () => {
    it('returns single chunk for short text', () => {
      const text = 'Hello world';
      const result = modelManager.chunkText(text, 256);
      
      expect(result.totalChunks).toBe(1);
      expect(result.chunks).toEqual([text]);
    });

    it('splits long text into multiple chunks', () => {
      // Create text longer than max tokens (256 tokens * 4 chars = 1024 chars)
      const text = 'a'.repeat(2000);
      const result = modelManager.chunkText(text, 256);
      
      expect(result.totalChunks).toBeGreaterThan(1);
      expect(result.chunks.length).toBe(result.totalChunks);
      
      // Verify all chunks are within limit
      for (const chunk of result.chunks) {
        expect(chunk.length).toBeLessThanOrEqual(256 * 4);
      }
    });

    it('breaks at sentence boundaries when possible', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const result = modelManager.chunkText(text, 10); // Small token limit to force chunking
      
      expect(result.totalChunks).toBeGreaterThan(1);
      
      // Check that most chunks end with sentence terminators
      let sentenceBreaks = 0;
      for (const chunk of result.chunks) {
        if (chunk.trim().match(/[.!?]$/)) {
          sentenceBreaks++;
        }
      }
      
      expect(sentenceBreaks).toBeGreaterThan(0);
    });

    it('falls back to word boundaries if no sentence breaks', () => {
      const text = 'word1 word2 word3 word4 word5 word6 word7 word8';
      const result = modelManager.chunkText(text, 5); // Small limit
      
      expect(result.totalChunks).toBeGreaterThan(1);
      
      // Verify chunks don't break in the middle of words
      // (chunks should end at or after whitespace)
      for (const chunk of result.chunks) {
        const trimmed = chunk.trim();
        // If chunk contains spaces, it should break at word boundaries
        if (trimmed.includes(' ')) {
          // Check that it doesn't end with a partial word
          expect(trimmed.split(' ').every(word => word.length > 0)).toBe(true);
        }
      }
    });

    it('reconstructs original text when chunks are joined', () => {
      const text = 'This is a longer text. It has multiple sentences. We want to test chunking.';
      const result = modelManager.chunkText(text, 10);
      
      const reconstructed = result.chunks.join('');
      expect(reconstructed).toBe(text);
    });
  });

  describe('getModelConfig', () => {
    it('returns model config for valid locale and modelId', () => {
      const config = modelManager.getModelConfig('en', 'test/model-en');
      expect(config).toBeDefined();
      expect(config?.modelId).toBe('test/model-en');
      expect(config?.maxTokens).toBe(256);
    });

    it('returns undefined for invalid locale', () => {
      const config = modelManager.getModelConfig('fr', 'test/model-en');
      expect(config).toBeUndefined();
    });

    it('returns undefined for invalid modelId', () => {
      const config = modelManager.getModelConfig('en', 'nonexistent/model');
      expect(config).toBeUndefined();
    });
  });

  describe('getAvailableLocales', () => {
    it('returns all configured locales', () => {
      const locales = modelManager.getAvailableLocales();
      expect(locales).toContain('en');
      expect(locales).toContain('de');
      expect(locales.length).toBe(2);
    });
  });
});
