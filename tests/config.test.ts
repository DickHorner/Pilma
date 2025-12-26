import { describe, it, expect } from 'vitest';
import { validateConfig, DEFAULT_CONFIG, PilmaConfig } from '../src/companion/config';

describe('Config', () => {
  describe('DEFAULT_CONFIG', () => {
    it('has valid structure', () => {
      expect(DEFAULT_CONFIG.locales).toBeDefined();
      expect(DEFAULT_CONFIG.allowRemoteDownload).toBe(false);
      expect(DEFAULT_CONFIG.cacheDir).toBeDefined();
    });

    it('includes English locale', () => {
      expect(DEFAULT_CONFIG.locales.en).toBeDefined();
      expect(DEFAULT_CONFIG.locales.en.length).toBeGreaterThan(0);
    });

    it('includes German locale', () => {
      expect(DEFAULT_CONFIG.locales.de).toBeDefined();
      expect(DEFAULT_CONFIG.locales.de.length).toBeGreaterThan(0);
    });

    it('includes recommended model', () => {
      const enModel = DEFAULT_CONFIG.locales.en[0];
      expect(enModel.modelId).toBe('iiiorg/piiranha-v1-detect-personal-information');
      expect(enModel.maxTokens).toBe(256);
    });
  });

  describe('validateConfig', () => {
    it('accepts valid config', () => {
      expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow();
    });

    it('rejects config without locales', () => {
      const invalidConfig = {
        locales: {},
        allowRemoteDownload: false,
        cacheDir: '.pilma/models',
      };
      expect(() => validateConfig(invalidConfig)).toThrow('at least one locale');
    });

    it('rejects locale without models', () => {
      const invalidConfig: PilmaConfig = {
        locales: {
          en: [],
        },
        allowRemoteDownload: false,
        cacheDir: '.pilma/models',
      };
      expect(() => validateConfig(invalidConfig)).toThrow('at least one model');
    });

    it('rejects model without modelId', () => {
      const invalidConfig = {
        locales: {
          en: [
            {
              modelId: '',
              maxTokens: 256,
            },
          ],
        },
        allowRemoteDownload: false,
        cacheDir: '.pilma/models',
      } as PilmaConfig;
      expect(() => validateConfig(invalidConfig)).toThrow('Invalid modelId');
    });

    it('rejects model with invalid maxTokens', () => {
      const invalidConfig: PilmaConfig = {
        locales: {
          en: [
            {
              modelId: 'test/model',
              maxTokens: 0,
            },
          ],
        },
        allowRemoteDownload: false,
        cacheDir: '.pilma/models',
      };
      expect(() => validateConfig(invalidConfig)).toThrow('Invalid maxTokens');
    });

    it('rejects non-boolean allowRemoteDownload', () => {
      const invalidConfig = {
        locales: {
          en: [
            {
              modelId: 'test/model',
              maxTokens: 256,
            },
          ],
        },
        allowRemoteDownload: 'true',
        cacheDir: '.pilma/models',
      } as unknown as PilmaConfig;
      expect(() => validateConfig(invalidConfig)).toThrow('must be a boolean');
    });

    it('rejects empty cacheDir', () => {
      const invalidConfig = {
        locales: {
          en: [
            {
              modelId: 'test/model',
              maxTokens: 256,
            },
          ],
        },
        allowRemoteDownload: false,
        cacheDir: '',
      } as PilmaConfig;
      expect(() => validateConfig(invalidConfig)).toThrow('cacheDir');
    });
  });
});
