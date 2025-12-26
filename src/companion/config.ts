/**
 * Configuration schema for model management.
 * Defines locale-to-model mappings and download preferences.
 */

export type ModelConfig = {
  /** Model identifier from HuggingFace */
  modelId: string;
  /** Maximum token length for this model */
  maxTokens: number;
};

export type PilmaConfig = {
  /** Mapping of locale codes to model configurations */
  locales: Record<string, ModelConfig[]>;
  /** Allow downloading models from remote sources */
  allowRemoteDownload: boolean;
  /** Local cache directory for downloaded models */
  cacheDir: string;
};

/**
 * Default configuration with recommended model.
 * Model: iiiorg/piiranha-v1-detect-personal-information
 * - License: cc-by-nc-nd-4.0 (non-commercial, no-derivatives)
 * - Context length: 256 DeBERTa tokens
 * - Supports 6 languages including German
 */
export const DEFAULT_CONFIG: PilmaConfig = {
  locales: {
    en: [
      {
        modelId: 'iiiorg/piiranha-v1-detect-personal-information',
        maxTokens: 256,
      },
    ],
    de: [
      {
        modelId: 'iiiorg/piiranha-v1-detect-personal-information',
        maxTokens: 256,
      },
    ],
  },
  allowRemoteDownload: false, // User must explicitly enable
  cacheDir: '.pilma/models',
};

/**
 * Validate configuration object.
 */
export function validateConfig(config: PilmaConfig): void {
  if (!config.locales || Object.keys(config.locales).length === 0) {
    throw new Error('Config must define at least one locale');
  }

  for (const [locale, models] of Object.entries(config.locales)) {
    if (!Array.isArray(models) || models.length === 0) {
      throw new Error(`Locale ${locale} must have at least one model`);
    }

    for (const model of models) {
      if (!model.modelId || typeof model.modelId !== 'string') {
        throw new Error(`Invalid modelId for locale ${locale}`);
      }
      if (!model.maxTokens || model.maxTokens <= 0) {
        throw new Error(`Invalid maxTokens for model ${model.modelId}`);
      }
    }
  }

  if (typeof config.allowRemoteDownload !== 'boolean') {
    throw new Error('allowRemoteDownload must be a boolean');
  }

  if (!config.cacheDir || typeof config.cacheDir !== 'string') {
    throw new Error('cacheDir must be a non-empty string');
  }
}
