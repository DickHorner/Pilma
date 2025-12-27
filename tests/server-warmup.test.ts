import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import fs from 'fs';
import { CompanionServer } from '../src/companion/server';
import { PilmaConfig } from '../src/companion/config';

const TEST_PORT = 8788;
const TEST_HOST = '127.0.0.1';
const TEST_SECRET = 'test-secret-key';
const TEST_CACHE_DIR = '.pilma/test-server-cache';

const TEST_PILMA_CONFIG: PilmaConfig = {
  localeModels: {
    en: ['test-model'],
  },
  models: {
    'test-model': {
      modelId: 'test-model',
      contextLength: 256,
      languages: ['en'],
    },
  },
  allowRemoteDownload: true,
  cacheDir: TEST_CACHE_DIR,
};

describe('server model warmup integration', () => {
  let server: CompanionServer;

  beforeEach(async () => {
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }

    server = new CompanionServer({
      port: TEST_PORT,
      host: TEST_HOST,
      secret: TEST_SECRET,
      pilmaConfig: TEST_PILMA_CONFIG,
    });
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  function makeRequest(
    path: string,
    method: string,
    body?: object,
    headers?: Record<string, string>
  ): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const options: http.RequestOptions = {
        hostname: TEST_HOST,
        port: TEST_PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode || 500, body: data });
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  it('requires authentication', async () => {
    const response = await makeRequest('/model/warmup', 'POST', { modelId: 'test-model' });
    expect(response.status).toBe(401);
    const data = JSON.parse(response.body);
    expect(data.error).toBe('Unauthorized');
  });

  it('warms up model with modelId', async () => {
    const response = await makeRequest(
      '/model/warmup',
      'POST',
      { modelId: 'test-model' },
      { 'X-Pilma-Secret': TEST_SECRET }
    );

    expect(response.status).toBe(200);
    const data = JSON.parse(response.body);
    expect(data.status).toBe('ok');
    expect(data.modelId).toBe('test-model');
    expect(data.cached).toBe(true);
    expect(data.loaded).toBe(true);
  });

  it('warms up model with locale', async () => {
    const response = await makeRequest(
      '/model/warmup',
      'POST',
      { locale: 'en' },
      { 'X-Pilma-Secret': TEST_SECRET }
    );

    expect(response.status).toBe(200);
    const data = JSON.parse(response.body);
    expect(data.status).toBe('ok');
    expect(data.modelId).toBe('test-model');
    expect(data.cached).toBe(true);
    expect(data.loaded).toBe(true);
  });

  it('returns error for unknown locale', async () => {
    const response = await makeRequest(
      '/model/warmup',
      'POST',
      { locale: 'unknown' },
      { 'X-Pilma-Secret': TEST_SECRET }
    );

    expect(response.status).toBe(400);
    const data = JSON.parse(response.body);
    expect(data.error).toContain('No models configured for locale');
  });

  it('returns error for missing modelId and locale', async () => {
    const response = await makeRequest(
      '/model/warmup',
      'POST',
      {},
      { 'X-Pilma-Secret': TEST_SECRET }
    );

    expect(response.status).toBe(400);
    const data = JSON.parse(response.body);
    expect(data.error).toContain('Missing modelId or locale');
  });

  it('returns ok for already warmed model', async () => {
    // Warmup once
    await makeRequest(
      '/model/warmup',
      'POST',
      { modelId: 'test-model' },
      { 'X-Pilma-Secret': TEST_SECRET }
    );

    // Warmup again
    const response = await makeRequest(
      '/model/warmup',
      'POST',
      { modelId: 'test-model' },
      { 'X-Pilma-Secret': TEST_SECRET }
    );

    expect(response.status).toBe(200);
    const data = JSON.parse(response.body);
    expect(data.status).toBe('ok');
    expect(data.cached).toBe(true);
    expect(data.loaded).toBe(true);
  });

  it('handles download disabled config', async () => {
    await server.stop();

    const disabledConfig: PilmaConfig = {
      ...TEST_PILMA_CONFIG,
      allowRemoteDownload: false,
    };

    server = new CompanionServer({
      port: TEST_PORT,
      host: TEST_HOST,
      secret: TEST_SECRET,
      pilmaConfig: disabledConfig,
    });
    await server.start();

    const response = await makeRequest(
      '/model/warmup',
      'POST',
      { modelId: 'test-model' },
      { 'X-Pilma-Secret': TEST_SECRET }
    );

    expect(response.status).toBe(500);
    const data = JSON.parse(response.body);
    expect(data.error).toBe('Internal server error');
    expect(data.message).toContain('Remote download disabled');
  });

  it('prefers modelId over locale', async () => {
    const multiModelConfig: PilmaConfig = {
      localeModels: {
        en: ['model-a', 'model-b'],
      },
      models: {
        'model-a': {
          modelId: 'model-a',
          contextLength: 256,
          languages: ['en'],
        },
        'model-b': {
          modelId: 'model-b',
          contextLength: 256,
          languages: ['en'],
        },
      },
      allowRemoteDownload: true,
      cacheDir: TEST_CACHE_DIR,
    };

    await server.stop();
    server = new CompanionServer({
      port: TEST_PORT,
      host: TEST_HOST,
      secret: TEST_SECRET,
      pilmaConfig: multiModelConfig,
    });
    await server.start();

    const response = await makeRequest(
      '/model/warmup',
      'POST',
      { modelId: 'model-b', locale: 'en' },
      { 'X-Pilma-Secret': TEST_SECRET }
    );

    expect(response.status).toBe(200);
    const data = JSON.parse(response.body);
    expect(data.modelId).toBe('model-b');
  });

  it('uses first model for locale when no modelId', async () => {
    const multiModelConfig: PilmaConfig = {
      localeModels: {
        en: ['model-a', 'model-b'],
      },
      models: {
        'model-a': {
          modelId: 'model-a',
          contextLength: 256,
          languages: ['en'],
        },
        'model-b': {
          modelId: 'model-b',
          contextLength: 256,
          languages: ['en'],
        },
      },
      allowRemoteDownload: true,
      cacheDir: TEST_CACHE_DIR,
    };

    await server.stop();
    server = new CompanionServer({
      port: TEST_PORT,
      host: TEST_HOST,
      secret: TEST_SECRET,
      pilmaConfig: multiModelConfig,
    });
    await server.start();

    const response = await makeRequest(
      '/model/warmup',
      'POST',
      { locale: 'en' },
      { 'X-Pilma-Secret': TEST_SECRET }
    );

    expect(response.status).toBe(200);
    const data = JSON.parse(response.body);
    expect(data.modelId).toBe('model-a');
  });
});
