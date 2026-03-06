# PR1 Testing Guide

## Automated Checks

Run the full local gate set:

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm test
```

## Manual Smoke Test

Start the service:

```bash
npm run companion
```

The service prints the localhost URL and the generated secret.

### 1. Health

```bash
curl http://127.0.0.1:8787/health
```

Expected response:

```json
{"status":"ok","sessions":0}
```

### 2. Unauthorized request

```bash
curl -X POST http://127.0.0.1:8787/anonymize ^
  -H "Content-Type: application/json" ^
  -d "{\"sessionId\":\"demo\",\"text\":\"Email user@example.com\"}"
```

Expected response:

```json
{"error":"Unauthorized"}
```

### 3. Anonymize

```bash
curl -X POST http://127.0.0.1:8787/anonymize ^
  -H "Content-Type: application/json" ^
  -H "X-Pilma-Secret: YOUR_SECRET" ^
  -d "{\"sessionId\":\"demo\",\"text\":\"Contact user@example.com or call 123-456-7890\"}"
```

Expected response shape:

```json
{
  "text": "Contact §§EMAIL_1~...§§ or call §§PHONE_1~...§§",
  "counts": { "EMAIL": 1, "PHONE": 1 },
  "traceId": "trace-..."
}
```

### 4. Deanonymize

```bash
curl -X POST http://127.0.0.1:8787/deanonymize ^
  -H "Content-Type: application/json" ^
  -H "X-Pilma-Secret: YOUR_SECRET" ^
  -d "{\"sessionId\":\"demo\",\"text\":\"Contact §§EMAIL_1~...§§ or call §§PHONE_1~...§§\"}"
```

Expected response shape:

```json
{ "text": "Contact user@example.com or call 123-456-7890" }
```

### 5. Reset session

```bash
curl -X POST http://127.0.0.1:8787/session/reset ^
  -H "Content-Type: application/json" ^
  -H "X-Pilma-Secret: YOUR_SECRET" ^
  -d "{\"sessionId\":\"demo\"}"
```

Expected response:

```json
{"status":"ok"}
```

### 6. Warm up a model

Use a config that allows remote download, or pre-cache the configured model first. Then call:

```bash
curl -X POST http://127.0.0.1:8787/model/warmup ^
  -H "Content-Type: application/json" ^
  -H "X-Pilma-Secret: YOUR_SECRET" ^
  -d "{\"modelId\":\"iiiorg/piiranha-v1-detect-personal-information\"}"
```

Expected response shape:

```json
{
  "status": "ok",
  "modelId": "iiiorg/piiranha-v1-detect-personal-information",
  "cached": true,
  "loaded": true
}
```

If remote download is disabled and the model is not cached, the endpoint should return an error message explaining that download is disabled.
