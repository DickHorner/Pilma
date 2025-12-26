import http from 'http';
import { Vault } from './vault';
import { Anonymizer } from './anonymizer';

/**
 * Companion service HTTP server.
 * Provides PII anonymization/deanonymization endpoints.
 * Requires shared secret authentication.
 */

export type ServerConfig = {
  port: number;
  host: string;
  secret: string;
};

export class CompanionServer {
  private server: http.Server | null = null;
  private vault: Vault;
  private anonymizer: Anonymizer;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.vault = new Vault();
    this.anonymizer = new Anonymizer(this.vault);
  }

  /**
   * Start the HTTP server.
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`Companion service running at http://${this.config.host}:${this.config.port}`);
        console.log(`Shared secret: ${this.config.secret}`);
        resolve();
      });
    });
  }

  /**
   * Stop the HTTP server.
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        // Close all existing connections
        this.server.closeAllConnections?.(); // Node 18.2+
        this.server.close((err) => {
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
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // CORS headers for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-A5-PII-Secret');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Route requests
    const url = req.url || '';

    if (req.method === 'GET' && url === '/health') {
      this.handleHealth(req, res);
    } else if (req.method === 'POST' && url === '/anonymize') {
      this.handleAnonymize(req, res);
    } else if (req.method === 'POST' && url === '/deanonymize') {
      this.handleDeanonymize(req, res);
    } else if (req.method === 'POST' && url === '/session/reset') {
      this.handleSessionReset(req, res);
    } else if (req.method === 'POST' && url === '/model/warmup') {
      this.handleModelWarmup(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  /**
   * Verify shared secret header.
   */
  private verifyAuth(req: http.IncomingMessage): boolean {
    const secret = req.headers['x-a5-pii-secret'];
    return secret === this.config.secret;
  }

  /**
   * GET /health - Service health check.
   */
  private handleHealth(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      sessions: this.vault.getSessionCount(),
    }));
  }

  /**
   * POST /anonymize - Obfuscate PII in text.
   */
  private handleAnonymize(req: http.IncomingMessage, res: http.ServerResponse): void {
    this.readBody(req, (body) => {
      if (!this.verifyAuth(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const { sessionId, text } = JSON.parse(body);

        if (!sessionId || !text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing sessionId or text' }));
          return;
        }

        const result = this.anonymizer.anonymize(sessionId, text);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  }

  /**
   * POST /deanonymize - Restore obfuscated text.
   */
  private handleDeanonymize(req: http.IncomingMessage, res: http.ServerResponse): void {
    this.readBody(req, (body) => {
      if (!this.verifyAuth(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const parsed = body ? JSON.parse(body) : {};
        const { sessionId, text } = parsed;

        if (!sessionId || !text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing sessionId or text' }));
          return;
        }

        const result = this.anonymizer.deanonymize(sessionId, text);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  }

  /**
   * POST /session/reset - Clear session vault.
   */
  private handleSessionReset(req: http.IncomingMessage, res: http.ServerResponse): void {
    this.readBody(req, (body) => {
      if (!this.verifyAuth(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const { sessionId } = JSON.parse(body);

        if (!sessionId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing sessionId' }));
          return;
        }

        this.vault.clearSession(sessionId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  }

  /**
   * POST /model/warmup - Placeholder for PR2.
   */
  private handleModelWarmup(req: http.IncomingMessage, res: http.ServerResponse): void {
    this.readBody(req, () => {
      if (!this.verifyAuth(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'placeholder',
        message: 'Model warmup will be implemented in PR2',
      }));
    });
  }

  /**
   * Read request body.
   */
  private readBody(req: http.IncomingMessage, callback: (body: string) => void): void {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      callback(body);
    });
    req.on('error', (err) => {
      console.error('Error reading request body:', err);
      callback('');
    });
  }
}
