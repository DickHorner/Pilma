import { describe, it, expect } from 'vitest';
import { PilmaConfig, ModelConfig, DEFAULT_CONFIG, validateConfig } from '../src/companion/config';

describe('config validation', () => {
  it('accepts valid default config', () => {
    expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow();
  });

  it('rejects missing localeModels', () => {
    const config = { ...DEFAULT_CONFIG, localeModels: undefined as never };
    expect(() => validateConfig(config)).toThrow('localeModels must be an object');
  });

  it('rejects missing models registry', () => {
    const config = { ...DEFAULT_CONFIG, models: undefined as never };
    expect(() => validateConfig(config)).toThrow('models must be an object');
  });

  it('rejects non-boolean allowRemoteDownload', () => {
    const config = { ...DEFAULT_CONFIG, allowRemoteDownload: 'yes' as never };
    expect(() => validateConfig(config)).toThrow('allowRemoteDownload must be a boolean');
  });

  it('rejects missing cacheDir', () => {
    const config = { ...DEFAULT_CONFIG, cacheDir: '' };
    expect(() => validateConfig(config)).toThrow('cacheDir must be a non-empty string');
  });

  it('rejects non-array locale model list', () => {
    const config: PilmaConfig = {
      ...DEFAULT_CONFIG,
      localeModels: { en: 'not-an-array' as never },
    };
    expect(() => validateConfig(config)).toThrow('localeModels["en"] must be an array');
  });

  it('rejects reference to non-existent model', () => {
    const config: PilmaConfig = {
      ...DEFAULT_CONFIG,
      localeModels: { en: ['nonexistent-model'] },
    };
    expect(() => validateConfig(config)).toThrow(
      'Model "nonexistent-model" referenced in locale "en" not found in models registry'
    );
  });

  it('rejects mismatched modelId in model config', () => {
    const config: PilmaConfig = {
      ...DEFAULT_CONFIG,
      models: {
        'model-a': {
          modelId: 'model-b',
          contextLength: 256,
          languages: ['en'],
        },
      },
      localeModels: { en: ['model-a'] },
    };
    expect(() => validateConfig(config)).toThrow('mismatched modelId');
  });

  it('rejects zero or negative contextLength', () => {
    const config: PilmaConfig = {
      ...DEFAULT_CONFIG,
      models: {
        'test-model': {
          modelId: 'test-model',
          contextLength: 0,
          languages: ['en'],
        },
      },
      localeModels: { en: ['test-model'] },
    };
    expect(() => validateConfig(config)).toThrow('must have positive contextLength');
  });

  it('rejects empty languages array', () => {
    const config: PilmaConfig = {
      ...DEFAULT_CONFIG,
      models: {
        'test-model': {
          modelId: 'test-model',
          contextLength: 256,
          languages: [],
        },
      },
      localeModels: { en: ['test-model'] },
    };
    expect(() => validateConfig(config)).toThrow('must have non-empty languages array');
  });

  it('accepts config with multiple locales and models', () => {
    const config: PilmaConfig = {
      localeModels: {
        en: ['model-a', 'model-b'],
        de: ['model-a'],
      },
      models: {
        'model-a': {
          modelId: 'model-a',
          contextLength: 256,
          languages: ['en', 'de'],
        },
        'model-b': {
          modelId: 'model-b',
          contextLength: 512,
          languages: ['en'],
        },
      },
      allowRemoteDownload: true,
      cacheDir: '.pilma/cache',
    };
    expect(() => validateConfig(config)).not.toThrow();
  });
});
