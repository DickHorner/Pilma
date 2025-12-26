# PR1: Companion Service Testing Guide

## Overview
PR1 implements the companion service skeleton with:
- HTTP endpoints for anonymization/deanonymization
- Secret header authentication
- In-memory vault for PII mappings
- Minimal PII detection using regex patterns (PR2 will add model-based detection)

## How to Test

### 1. Start the Companion Service

```bash
npm install
npm run companion
```

The service will start on `http://127.0.0.1:8787` and print a generated shared secret.

### 2. Test Health Endpoint (No Auth Required)

```bash
curl http://127.0.0.1:8787/health
```

Expected response:
```json
{"status":"ok","sessions":0}
```

### 3. Test Authentication Failure

```bash
curl -X POST http://127.0.0.1:8787/anonymize \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","text":"Email: user@example.com"}'
```

Expected response:
```json
{"error":"Unauthorized"}
```

### 4. Test Anonymization (With Auth)

Replace `YOUR_SECRET` with the secret printed when starting the service.

```bash
curl -X POST http://127.0.0.1:8787/anonymize \
  -H "Content-Type: application/json" \
  -H "X-A5-PII-Secret: YOUR_SECRET" \
  -d '{"sessionId":"demo-session","text":"Contact me at john@example.com or call 555-123-4567"}'
```

Expected response:
```json
{
  "text": "Contact me at §§EMAIL_1~XXXX§§ or call §§PHONE_1~YYYY§§",
  "counts": {"EMAIL": 1, "PHONE": 1},
  "traceId": "trace-..."
}
```

### 5. Test Deanonymization

Use the obfuscated text from step 4:

```bash
curl -X POST http://127.0.0.1:8787/deanonymize \
  -H "Content-Type: application/json" \
  -H "X-A5-PII-Secret: YOUR_SECRET" \
  -d '{"sessionId":"demo-session","text":"Contact me at §§EMAIL_1~XXXX§§ or call §§PHONE_1~YYYY§§"}'
```

Expected response:
```json
{
  "text": "Contact me at john@example.com or call 555-123-4567"
}
```

### 6. Test Session Reset

```bash
curl -X POST http://127.0.0.1:8787/session/reset \
  -H "Content-Type: application/json" \
  -H "X-A5-PII-Secret: YOUR_SECRET" \
  -d '{"sessionId":"demo-session"}'
```

Expected response:
```json
{"status":"ok"}
```

After resetting, deanonymization will not restore PII (tokens remain as-is).

### 7. Test Model Warmup Placeholder

```bash
curl -X POST http://127.0.0.1:8787/model/warmup \
  -H "Content-Type: application/json" \
  -H "X-A5-PII-Secret: YOUR_SECRET" \
  -d '{}'
```

Expected response:
```json
{
  "status": "placeholder",
  "message": "Model warmup will be implemented in PR2"
}
```

## Running Tests

```bash
npm test
```

All tests should pass, including:
- Vault tests (session isolation, category counts)
- Anonymizer tests (regex-based PII detection, roundtrip)
- Server tests (authentication, endpoints, error handling)
- Trace tests (PII-safe logging)

## Security Notes

1. **No PII in logs**: The trace logs only contain lengths, category counts, and timings. Raw text is never logged.

2. **Localhost only**: The service binds to 127.0.0.1 by default.

3. **Secret required**: All POST endpoints require the `X-A5-PII-Secret` header.

4. **In-memory vault**: PII mappings are stored in memory only, never persisted to disk.

## Current Limitations (To Be Addressed in PR2)

1. **Simple regex patterns**: Currently detects EMAIL, PHONE, and SSN using regex. PR2 will integrate the HuggingFace model for better detection.

2. **No chunking**: PR2 will implement chunking for models with short context windows.

3. **No model download**: PR2 will implement model download and caching.

## Example Roundtrip Flow

```bash
# Start service
SECRET="test-secret-123" npm run companion

# In another terminal:
SECRET="test-secret-123"

# Anonymize
RESPONSE=$(curl -s -X POST http://127.0.0.1:8787/anonymize \
  -H "Content-Type: application/json" \
  -H "X-A5-PII-Secret: $SECRET" \
  -d '{"sessionId":"test","text":"Email: user@example.com, Phone: 555-123-4567"}')

echo "Anonymized: $(echo $RESPONSE | jq -r '.text')"
# Output: Email: §§EMAIL_1~XXXX§§, Phone: §§PHONE_1~YYYY§§

# Deanonymize
OBFUSCATED=$(echo $RESPONSE | jq -r '.text')
curl -s -X POST http://127.0.0.1:8787/deanonymize \
  -H "Content-Type: application/json" \
  -H "X-A5-PII-Secret: $SECRET" \
  -d "{\"sessionId\":\"test\",\"text\":\"$OBFUSCATED\"}" | jq -r '.text'
# Output: Email: user@example.com, Phone: 555-123-4567
```

## Risk Analysis

### PII Leakage Risks
- **Mitigated**: Regex patterns properly detect common PII formats
- **Mitigated**: Tokens are stable and reversible
- **Mitigated**: No PII in trace logs

### Authentication Risks
- **Mitigated**: Shared secret required for all POST endpoints
- **Future**: Consider rotating secrets or using time-based tokens

### Vault Risks
- **Mitigated**: In-memory only, session-scoped
- **Consideration**: No automatic cleanup of old sessions yet (could add TTL in future)

### Network Risks
- **Mitigated**: Localhost-only binding (127.0.0.1)
- **Mitigated**: CORS configured for local development
