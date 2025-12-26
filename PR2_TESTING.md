# PR2: Model Manager Testing Guide

## Overview
PR2 implements the Model Manager component with:
- Configuration schema for locale-to-model mappings
- Model download and caching infrastructure
- Model warmup endpoint implementation
- Text chunking for models with short context windows (256 tokens)

## What's New in PR2

### 1. Configuration System
- `PilmaConfig` type defines locale mappings and download preferences
- Default config includes recommended model: `iiiorg/piiranha-v1-detect-personal-information`
- Supports multiple locales (English, German by default)
- `allowRemoteDownload` flag controls whether models can be downloaded

### 2. Model Manager
- Downloads models from HuggingFace (stub implementation for PR2)
- Caches models locally in `.pilma/models` directory
- Implements chunking for text longer than model's token limit
- Tracks loaded models in memory

### 3. Updated /model/warmup Endpoint
- Now functional (no longer a placeholder)
- Downloads model if not cached (when allowed)
- Loads model into memory for use
- Returns model status (cached, loaded)

## How to Test

### 1. Start the Companion Service with Default Config

```bash
npm install
npm run companion
```

The service starts with `allowRemoteDownload: false` by default (user must explicitly enable).

### 2. Test Model Warmup with Download Disabled (Default)

```bash
SECRET="<your-secret-from-step-1>"

curl -X POST http://127.0.0.1:8787/model/warmup \
  -H "Content-Type: application/json" \
  -H "X-Pilma-Secret: $SECRET" \
  -d '{"modelId":"iiiorg/piiranha-v1-detect-personal-information","locale":"en"}'
```

Expected response (error because download is disabled):
```json
{
  "error": "Model warmup failed",
  "message": "Model iiiorg/piiranha-v1-detect-personal-information is not cached and remote download is disabled."
}
```

### 3. Test Model Warmup with Download Enabled

Start the service with download enabled:

```bash
# Set environment variable to enable downloads
ALLOW_REMOTE_DOWNLOAD=true npm run companion
```

Or create a custom config file `pilma-config.json`:
```json
{
  "locales": {
    "en": [
      {
        "modelId": "iiiorg/piiranha-v1-detect-personal-information",
        "maxTokens": 256
      }
    ]
  },
  "allowRemoteDownload": true,
  "cacheDir": ".pilma/models"
}
```

Now warmup the model:

```bash
SECRET="<your-secret>"

curl -X POST http://127.0.0.1:8787/model/warmup \
  -H "Content-Type: application/json" \
  -H "X-Pilma-Secret: $SECRET" \
  -d '{"modelId":"iiiorg/piiranha-v1-detect-personal-information","locale":"en"}'
```

Expected response (success):
```json
{
  "status": "ok",
  "modelId": "iiiorg/piiranha-v1-detect-personal-information",
  "locale": "en",
  "cached": true,
  "loaded": true
}
```

### 4. Verify Model Cache Directory

```bash
ls -la .pilma/models/
```

You should see a directory for the model:
```
iiiorg_piiranha-v1-detect-personal-information/
```

Inside the model directory:
```bash
ls -la .pilma/models/iiiorg_piiranha-v1-detect-personal-information/
```

You should see:
```
model.marker
```

The marker file contains metadata about the download:
```bash
cat .pilma/models/iiiorg_piiranha-v1-detect-personal-information/model.marker
```

### 5. Test Chunking Logic

The ModelManager includes a chunking method that splits text longer than the model's token limit. This is tested in the unit tests, but you can verify the logic:

```bash
npm test -- tests/model-manager.test.ts
```

Key chunking tests:
- Single chunk for short text
- Multiple chunks for long text
- Sentence boundary detection
- Word boundary fallback
- Reconstruction integrity

### 6. Test Configuration Validation

The config validation ensures all required fields are present and valid:

```bash
npm test -- tests/config.test.ts
```

Key validation tests:
- Valid default config
- Locale requirements
- Model requirements
- maxTokens validation
- allowRemoteDownload type checking

## Running All Tests

```bash
npm test
```

All tests should pass, including:
- Config validation (11 tests)
- ModelManager functionality (19 tests)
- Server integration (14 tests)
- Anonymizer (12 tests)
- Vault (7 tests)
- Trace (1 test)

Total: 64 tests

## Architecture Notes

### Model Download (Stub Implementation)

For PR2, model download is implemented as a stub:
- Creates a model directory in cache
- Writes a marker file with metadata
- Does NOT actually download model weights from HuggingFace

This allows us to test the infrastructure and API without the complexity of actual model downloads. Future PRs will integrate with HuggingFace's model hub.

### Chunking Strategy

The chunking implementation uses a conservative heuristic:
- ~4 characters per token (conservative for DeBERTa)
- Attempts to break at sentence boundaries (. ! ?)
- Falls back to word boundaries if no sentence break found
- Preserves original text when chunks are concatenated

For the recommended model (piiranha-v1):
- Max tokens: 256
- Max chunk size: ~1024 characters

### Config System

The config system is designed for future extensibility:
- Multiple models per locale
- Per-model token limits
- Custom cache directory
- Download permission control

## Security Notes

1. **Download Control**: Remote download is disabled by default. Users must explicitly enable it in config.

2. **PII-Safe Tracing**: Model operations are traced with:
   - Model ID
   - Action type (download_start, warmup_complete, etc.)
   - Timings
   - NO raw text or PII

3. **Localhost Only**: Service still binds to 127.0.0.1 by default.

4. **Secret Required**: All POST endpoints including /model/warmup require authentication.

## Limitations & Future Work

1. **Model Download**: Current implementation is a stub. Future PRs will:
   - Integrate with HuggingFace API
   - Download actual model weights
   - Verify model signatures
   - Handle download errors and retries

2. **Model Loading**: Current implementation marks models as "loaded" but doesn't actually load them. Future PRs will:
   - Integrate with transformers.js or similar
   - Load model weights into memory
   - Run actual inference

3. **Chunking**: Current implementation uses character-based heuristic. Future PRs will:
   - Use the actual model tokenizer
   - Provide exact token counts
   - Handle special tokens properly

4. **Anonymizer Integration**: The Anonymizer still uses regex patterns. Future PRs will:
   - Integrate ModelManager with Anonymizer
   - Use loaded models for PII detection
   - Process chunks through the model

## Risk Analysis

### Config Risks
- **Mitigated**: Validation ensures all required fields are present
- **Mitigated**: Type checking prevents invalid values
- **Consideration**: Config is currently code-based; could add file-based config loading

### Download Risks
- **Mitigated**: Download disabled by default
- **Mitigated**: User must explicitly enable remote downloads
- **Future**: Need to verify model signatures and checksums

### Caching Risks
- **Mitigated**: Cache directory created with proper permissions
- **Consideration**: No cache size limits yet (could add in future)
- **Consideration**: No cache expiration yet (could add in future)

### Chunking Risks
- **Mitigated**: Conservative character-per-token estimate ensures we stay under limit
- **Mitigated**: Reconstruction tested to ensure no data loss
- **Consideration**: Sentence/word boundaries might split PII entities (will be addressed when integrating with model)

## Example End-to-End Flow

```bash
# 1. Start service with downloads enabled
SECRET="test-secret-123" npm run companion

# In another terminal:
SECRET="test-secret-123"

# 2. Check health
curl http://127.0.0.1:8787/health

# 3. Warmup model (downloads and loads)
curl -X POST http://127.0.0.1:8787/model/warmup \
  -H "Content-Type: application/json" \
  -H "X-Pilma-Secret: $SECRET" \
  -d '{"modelId":"iiiorg/piiranha-v1-detect-personal-information","locale":"en"}'

# 4. Anonymize text (still uses regex for now)
curl -X POST http://127.0.0.1:8787/anonymize \
  -H "Content-Type: application/json" \
  -H "X-Pilma-Secret: $SECRET" \
  -d '{"sessionId":"session1","text":"Contact john@example.com for details"}'

# 5. Verify cache
ls -la .pilma/models/
```

## Next Steps (PR3)

PR3 will implement the browser extension MVP:
- Options page for configuration
- Content script for input interception
- Build scripts for Chrome and Firefox
- Integration with the companion service

The ModelManager infrastructure from PR2 provides the foundation for model-based PII detection that will be integrated in future iterations.
