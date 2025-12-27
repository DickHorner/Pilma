/**
 * Configuration schema for Pilma companion service.
 * Defines locale-to-model mappings and download permissions.
 */

export type ModelConfig = {
  modelId: string;
  contextLength: number; // max tokens
  languages: string[];
};

export type PilmaConfig = {
  /**
   * Locale-to-model mappings.
   * Key: locale code (e.g., "en", "de")
   * Value: array of model IDs for that locale
   */
  localeModels: Record<string, string[]>;

  /**
   * Model details registry.
   * Key: modelId
   * Value: model metadata
   */
  models: Record<string, ModelConfig>;

  /**
   * Allow downloading models from remote sources.
   * Disabled by default for security/bandwidth reasons.
   */
  allowRemoteDownload: boolean;

  /**
   * Local cache directory for downloaded models.
   * Relative to project root or absolute path.
   */
  cacheDir: string;
};

/**
 * Default configuration with recommended model.
 */
export const DEFAULT_CONFIG: PilmaConfig = {
  localeModels: {
    en: ['iiiorg/piiranha-v1-detect-personal-information'],
    de: ['iiiorg/piiranha-v1-detect-personal-information'],
    es: ['iiiorg/piiranha-v1-detect-personal-information'],
    fr: ['iiiorg/piiranha-v1-detect-personal-information'],
    it: ['iiiorg/piiranha-v1-detect-personal-information'],
    pt: ['iiiorg/piiranha-v1-detect-personal-information'],
  },
  models: {
    'iiiorg/piiranha-v1-detect-personal-information': {
      modelId: 'iiiorg/piiranha-v1-detect-personal-information',
      contextLength: 256, // DeBERTa tokens
      languages: ['en', 'de', 'es', 'fr', 'it', 'pt'],
    },
  },
  allowRemoteDownload: false,
  cacheDir: '.pilma/models',
};

/**
 * Validate configuration object.
 * Throws descriptive errors if invalid.
 */
export function validateConfig(config: PilmaConfig): void {
  if (!config.localeModels || typeof config.localeModels !== 'object') {
    throw new Error('Config validation failed: localeModels must be an object');
  }

  if (!config.models || typeof config.models !== 'object') {
    throw new Error('Config validation failed: models must be an object');
  }

  if (typeof config.allowRemoteDownload !== 'boolean') {
    throw new Error('Config validation failed: allowRemoteDownload must be a boolean');
  }

  if (!config.cacheDir || typeof config.cacheDir !== 'string') {
    throw new Error('Config validation failed: cacheDir must be a non-empty string');
  }

  // Validate that all referenced models exist in registry
  for (const [locale, modelIds] of Object.entries(config.localeModels)) {
    if (!Array.isArray(modelIds)) {
      throw new Error(`Config validation failed: localeModels["${locale}"] must be an array`);
    }

    for (const modelId of modelIds) {
      if (!config.models[modelId]) {
        throw new Error(
          `Config validation failed: Model "${modelId}" referenced in locale "${locale}" not found in models registry`
        );
      }
    }
  }

  // Validate model configs
  for (const [modelId, modelConfig] of Object.entries(config.models)) {
    if (modelConfig.modelId !== modelId) {
      throw new Error(
        `Config validation failed: Model "${modelId}" has mismatched modelId "${modelConfig.modelId}"`
      );
    }

    if (typeof modelConfig.contextLength !== 'number' || modelConfig.contextLength <= 0) {
      throw new Error(
        `Config validation failed: Model "${modelId}" must have positive contextLength`
      );
    }

    if (!Array.isArray(modelConfig.languages) || modelConfig.languages.length === 0) {
      throw new Error(
        `Config validation failed: Model "${modelId}" must have non-empty languages array`
      );
    }
  }
}
