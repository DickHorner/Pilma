import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { CompanionServer } from '../src/companion/server';

describe('CompanionServer', () => {
  let server: CompanionServer;
  const config = {
    port: 8788,
    host: '127.0.0.1',
    secret: 'test-secret-123',
  };

  beforeEach(async () => {
    server = new CompanionServer(config);
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('GET /health', () => {
    it('returns health status without authentication', async () => {
      const response = await makeRequest('GET', '/health');

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.sessions).toBe(0);
    });
  });

  describe('POST /anonymize', () => {
    it('requires authentication', async () => {
      const response = await makeRequest('POST', '/anonymize', {
        sessionId: 'session-1',
        text: 'Email: user@example.com',
      });

      expect(response.status).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('anonymizes text with valid authentication', async () => {
      const response = await makeRequest(
        'POST',
        '/anonymize',
        {
          sessionId: 'session-1',
          text: 'Email: user@example.com',
        },
        { 'X-Pilma-Secret': config.secret }
      );

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.text).not.toContain('user@example.com');
      expect(body.text).toContain('§§EMAIL_1~');
      expect(body.counts.EMAIL).toBe(1);
      expect(body.traceId).toBeDefined();
    });

    it('returns 400 for missing sessionId', async () => {
      const response = await makeRequest(
        'POST',
        '/anonymize',
        { text: 'Email: user@example.com' },
        { 'X-Pilma-Secret': config.secret }
      );

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing sessionId');
    });

    it('returns 400 for missing text', async () => {
      const response = await makeRequest(
        'POST',
        '/anonymize',
        { sessionId: 'session-1' },
        { 'X-Pilma-Secret': config.secret }
      );

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing');
    });
  });

  describe('POST /deanonymize', () => {
    it('requires authentication', async () => {
      const response = await makeRequest('POST', '/deanonymize', {
        sessionId: 'session-1',
        text: '§§EMAIL_1~ABCD§§',
      });

      expect(response.status).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('deanonymizes text with valid authentication', async () => {
      // First anonymize
      const anonymizeResponse = await makeRequest(
        'POST',
        '/anonymize',
        {
          sessionId: 'session-1',
          text: 'Email: user@example.com',
        },
        { 'X-Pilma-Secret': config.secret }
      );

      const anonymizeBody = JSON.parse(anonymizeResponse.body);

      // Then deanonymize
      const deanonymizeResponse = await makeRequest(
        'POST',
        '/deanonymize',
        {
          sessionId: 'session-1',
          text: anonymizeBody.text,
        },
        { 'X-Pilma-Secret': config.secret }
      );

      expect(deanonymizeResponse.status).toBe(200);
      const body = JSON.parse(deanonymizeResponse.body);
      expect(body.text).toBe('Email: user@example.com');
    });

    it('returns 400 for missing sessionId', async () => {
      const response = await makeRequest(
        'POST',
        '/deanonymize',
        { text: '§§EMAIL_1~ABCD§§' },
        { 'X-Pilma-Secret': config.secret }
      );

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing sessionId');
    });
  });

  describe('POST /session/reset', () => {
    it('requires authentication', async () => {
      const response = await makeRequest('POST', '/session/reset', {
        sessionId: 'session-1',
      });

      expect(response.status).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('clears session data with valid authentication', async () => {
      // First anonymize
      const anonymizeResponse = await makeRequest(
        'POST',
        '/anonymize',
        {
          sessionId: 'session-1',
          text: 'Email: user@example.com',
        },
        { 'X-Pilma-Secret': config.secret }
      );

      const anonymizeBody = JSON.parse(anonymizeResponse.body);

      // Reset session
      const resetResponse = await makeRequest(
        'POST',
        '/session/reset',
        { sessionId: 'session-1' },
        { 'X-Pilma-Secret': config.secret }
      );

      expect(resetResponse.status).toBe(200);
      const resetBody = JSON.parse(resetResponse.body);
      expect(resetBody.status).toBe('ok');

      // Try to deanonymize - should leave tokens as-is
      const deanonymizeResponse = await makeRequest(
        'POST',
        '/deanonymize',
        {
          sessionId: 'session-1',
          text: anonymizeBody.text,
        },
        { 'X-Pilma-Secret': config.secret }
      );

      const deanonymizeBody = JSON.parse(deanonymizeResponse.body);
      expect(deanonymizeBody.text).toBe(anonymizeBody.text); // Token remains
    });
  });

  describe('POST /model/warmup', () => {
    it('requires authentication', async () => {
      const response = await makeRequest('POST', '/model/warmup', {});

      expect(response.status).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('warms up model with modelId', async () => {
      const response = await makeRequest(
        'POST',
        '/model/warmup',
        { modelId: 'iiiorg/piiranha-v1-detect-personal-information' },
        { 'X-Pilma-Secret': config.secret }
      );

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.modelId).toBe('iiiorg/piiranha-v1-detect-personal-information');
      expect(body.cached).toBe(true);
      expect(body.loaded).toBe(true);
    });
  });

  describe('roundtrip', () => {
    it('preserves data through anonymize/deanonymize cycle', async () => {
      const originalText = 'Contact user@example.com or call 123-456-7890';

      // Anonymize
      const anonymizeResponse = await makeRequest(
        'POST',
        '/anonymize',
        { sessionId: 'session-1', text: originalText },
        { 'X-Pilma-Secret': config.secret }
      );

      const anonymizeBody = JSON.parse(anonymizeResponse.body);
      expect(anonymizeBody.text).not.toContain('user@example.com');
      expect(anonymizeBody.text).not.toContain('123-456-7890');

      // Deanonymize
      const deanonymizeResponse = await makeRequest(
        'POST',
        '/deanonymize',
        { sessionId: 'session-1', text: anonymizeBody.text },
        { 'X-Pilma-Secret': config.secret }
      );

      const deanonymizeBody = JSON.parse(deanonymizeResponse.body);
      expect(deanonymizeBody.text).toBe(originalText);
    });
  });

  // Helper function to make HTTP requests
  function makeRequest(
    method: string,
    path: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const options: http.RequestOptions = {
        hostname: config.host,
        port: config.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'close',
          ...headers,
        },
        agent: false, // Disable connection pooling
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, body });
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }
});
