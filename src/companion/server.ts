import http from 'http';
import crypto from 'crypto';
import { Vault } from './vault';
import { Anonymizer } from './anonymizer';
import { ModelManager } from './model-manager';
import { PilmaConfig, DEFAULT_CONFIG } from './config';

/**
 * Companion service HTTP server.
 * Provides PII anonymization/deanonymization endpoints.
 * Requires shared secret authentication.
 */

export type ServerConfig = {
  port: number;
  host: string;
  secret: string;
  pilmaConfig?: PilmaConfig;
};

export class CompanionServer {
  private static readonly JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
  private static readonly MAX_BODY_BYTES = 1024 * 1024;
  private server: http.Server | null = null;
  private vault: Vault;
  private anonymizer: Anonymizer;
  private modelManager: ModelManager;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.vault = new Vault();
    this.anonymizer = new Anonymizer(this.vault);
    this.modelManager = new ModelManager(config.pilmaConfig || DEFAULT_CONFIG);
  }

  /**
   * Start the HTTP server.
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        void this.handleRequest(req, res).catch((err) => {
          if (!res.headersSent) {
            this.writeJson(res, 500, { error: 'Internal server error' });
          }
          if (err instanceof Error) {
            console.error('Unhandled request error:', err.message);
          }
        });
      });

      const handleError = (err: Error) => {
        this.server?.off('listening', handleListening);
        reject(err);
      };

      const handleListening = () => {
        this.server?.off('error', handleError);
        console.log(`Companion service running at http://${this.config.host}:${this.getPort()}`);
        resolve();
      };

      this.server.once('error', handleError);
      this.server.once('listening', handleListening);
      this.server.listen(this.config.port, this.config.host);
    });
  }

  /**
   * Stop the HTTP server.
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        const activeServer = this.server;
        this.server = null;
        activeServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming HTTP requests.
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    this.applyCorsHeaders(req, res);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Pilma-Secret');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Route requests
    const url = req.url || '';

    if (req.method === 'GET' && url === '/health') {
      this.handleHealth(res);
    } else if (req.method === 'POST' && url === '/anonymize') {
      await this.handleAnonymize(req, res);
    } else if (req.method === 'POST' && url === '/deanonymize') {
      await this.handleDeanonymize(req, res);
    } else if (req.method === 'POST' && url === '/session/reset') {
      await this.handleSessionReset(req, res);
    } else if (req.method === 'POST' && url === '/model/warmup') {
      await this.handleModelWarmup(req, res);
    } else {
      this.writeJson(res, 404, { error: 'Not found' });
    }
  }

  /**
   * Verify shared secret header.
   */
  private verifyAuth(req: http.IncomingMessage): boolean {
    const secret = req.headers['x-pilma-secret'];
    if (Array.isArray(secret)) {
      return secret.some((value) => this.secretsMatch(value, this.config.secret));
    }
    return typeof secret === 'string' && this.secretsMatch(secret, this.config.secret);
  }

  /**
   * GET /health - Service health check.
   */
  private handleHealth(res: http.ServerResponse): void {
    this.writeJson(res, 200, {
      status: 'ok',
      sessions: this.vault.getSessionCount(),
    });
  }

  /**
   * POST /anonymize - Obfuscate PII in text.
   */
  private async handleAnonymize(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    if (!this.verifyAuth(req)) {
      this.drainRequest(req);
      this.writeJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    if (!this.hasJsonContentType(req)) {
      this.drainRequest(req);
      this.writeJson(res, 415, { error: 'Content-Type must be application/json' });
      return;
    }

    try {
      const { sessionId, text } = await this.readJsonBody(req);

      if (!this.isNonEmptyString(sessionId)) {
        this.writeJson(res, 400, { error: 'Missing sessionId' });
        return;
      }

      if (typeof text !== 'string') {
        this.writeJson(res, 400, { error: 'Missing text' });
        return;
      }

      const result = this.anonymizer.anonymize(sessionId, text);
      this.writeJson(res, 200, result);
    } catch (err) {
      this.handleRouteError(res, err);
    }
  }

  /**
   * POST /deanonymize - Restore obfuscated text.
   */
  private async handleDeanonymize(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    if (!this.verifyAuth(req)) {
      this.drainRequest(req);
      this.writeJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    if (!this.hasJsonContentType(req)) {
      this.drainRequest(req);
      this.writeJson(res, 415, { error: 'Content-Type must be application/json' });
      return;
    }

    try {
      const { sessionId, text } = await this.readJsonBody(req);

      if (!this.isNonEmptyString(sessionId)) {
        this.writeJson(res, 400, { error: 'Missing sessionId' });
        return;
      }

      if (typeof text !== 'string') {
        this.writeJson(res, 400, { error: 'Missing text' });
        return;
      }

      const result = this.anonymizer.deanonymize(sessionId, text);
      this.writeJson(res, 200, result);
    } catch (err) {
      this.handleRouteError(res, err);
    }
  }

  /**
   * POST /session/reset - Clear session vault.
   */
  private async handleSessionReset(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    if (!this.verifyAuth(req)) {
      this.drainRequest(req);
      this.writeJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    if (!this.hasJsonContentType(req)) {
      this.drainRequest(req);
      this.writeJson(res, 415, { error: 'Content-Type must be application/json' });
      return;
    }

    try {
      const { sessionId } = await this.readJsonBody(req);

      if (!this.isNonEmptyString(sessionId)) {
        this.writeJson(res, 400, { error: 'Missing sessionId' });
        return;
      }

      this.vault.clearSession(sessionId);
      this.writeJson(res, 200, { status: 'ok' });
    } catch (err) {
      this.handleRouteError(res, err);
    }
  }

  /**
   * Download and load model.
   */
  private async handleModelWarmup(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    if (!this.verifyAuth(req)) {
      this.drainRequest(req);
      this.writeJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    if (!this.hasJsonContentType(req)) {
      this.drainRequest(req);
      this.writeJson(res, 415, { error: 'Content-Type must be application/json' });
      return;
    }

    try {
      const { modelId, locale } = await this.readJsonBody(req);
      const parsedModelId = typeof modelId === 'string' ? modelId : undefined;
      const parsedLocale = typeof locale === 'string' ? locale : undefined;

      let targetModelId = parsedModelId;

      if (!targetModelId && parsedLocale) {
        const modelsForLocale = this.modelManager.getModelsForLocale(parsedLocale);
        if (modelsForLocale.length === 0) {
          this.writeJson(res, 400, { error: `No models configured for locale "${parsedLocale}"` });
          return;
        }
        targetModelId = modelsForLocale[0];
      }

      if (!targetModelId) {
        this.writeJson(res, 400, { error: 'Missing modelId or locale' });
        return;
      }

      const cached = this.modelManager.isModelCached(targetModelId);
      const loaded = this.modelManager.isModelLoaded(targetModelId);

      if (!cached || !loaded) {
        await this.modelManager.warmup(targetModelId);
      }

      this.writeJson(res, 200, {
        status: 'ok',
        modelId: targetModelId,
        cached: this.modelManager.isModelCached(targetModelId),
        loaded: this.modelManager.isModelLoaded(targetModelId),
      });
    } catch (err) {
      if (err instanceof HttpError) {
        this.handleRouteError(res, err);
        return;
      }

      this.writeJson(res, 500, {
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * Read request body.
   */
  private async readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    const rawBody = await this.readBody(req);
    if (rawBody.length === 0) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new HttpError(400, 'Request body must be a JSON object');
      }
      return parsed as Record<string, unknown>;
    } catch (err) {
      if (err instanceof HttpError) {
        throw err;
      }
      throw new HttpError(400, 'Invalid JSON request body');
    }
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      let bodyBytes = 0;
      let settled = false;

      req.setEncoding('utf8');
      req.on('data', (chunk: string) => {
        if (settled) {
          return;
        }

        bodyBytes += Buffer.byteLength(chunk, 'utf8');
        if (bodyBytes > CompanionServer.MAX_BODY_BYTES) {
          settled = true;
          this.drainRequest(req);
          reject(new HttpError(413, 'Request body too large'));
          return;
        }

        body += chunk;
      });
      req.on('end', () => {
        if (!settled) {
          settled = true;
          resolve(body);
        }
      });
      req.on('error', (err) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      });
    });
  }

  private applyCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): void {
    const origin = req.headers.origin;
    if (typeof origin === 'string' && this.isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  }

  private isAllowedOrigin(origin: string): boolean {
    return (
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) ||
      origin.startsWith('chrome-extension://') ||
      origin.startsWith('moz-extension://')
    );
  }

  private hasJsonContentType(req: http.IncomingMessage): boolean {
    const contentType = req.headers['content-type'];
    const normalized = Array.isArray(contentType) ? contentType[0] : contentType;
    return typeof normalized === 'string' && normalized.toLowerCase().startsWith('application/json');
  }

  private handleRouteError(res: http.ServerResponse, err: unknown): void {
    if (err instanceof HttpError) {
      this.writeJson(res, err.statusCode, { error: err.message });
      return;
    }

    this.writeJson(res, 500, { error: 'Internal server error' });
  }

  private writeJson(res: http.ServerResponse, statusCode: number, payload: object): void {
    res.writeHead(statusCode, CompanionServer.JSON_HEADERS);
    res.end(JSON.stringify(payload));
  }

  private drainRequest(req: http.IncomingMessage): void {
    req.resume();
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private secretsMatch(provided: string, expected: string): boolean {
    const providedBytes = Buffer.from(provided, 'utf8');
    const expectedBytes = Buffer.from(expected, 'utf8');

    if (providedBytes.length !== expectedBytes.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBytes, expectedBytes);
  }

  private getPort(): number {
    const address = this.server?.address();
    if (address && typeof address === 'object') {
      return address.port;
    }
    return this.config.port;
  }
}

class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
