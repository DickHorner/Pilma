import crypto from 'crypto';

/**
 * In-memory PII vault for session-scoped mappings.
 * Stores obfuscated token -> original PII mappings.
 * Never persists to disk; ephemeral by design.
 */

export type VaultEntry = {
  token: string;
  originalText: string;
  category: string; // e.g., "EMAIL", "NAME", "PHONE"
  createdAt: number; // ms epoch
};

type SessionVault = {
  entries: Map<string, VaultEntry>;
  valueIndex: Map<string, string>;
  categoryCounters: Map<string, number>;
  lastAccessAt: number;
};

export class Vault {
  private sessions: Map<string, SessionVault>;
  private readonly sessionTtlMs: number;

  constructor(sessionTtlMs = 30 * 60 * 1000) {
    this.sessions = new Map();
    this.sessionTtlMs = sessionTtlMs;
  }

  /**
   * Store a PII mapping for a given session.
   */
  store(sessionId: string, token: string, originalText: string, category: string): void {
    const sessionVault = this.getOrCreateSession(sessionId);
    const entry: VaultEntry = {
      token,
      originalText,
      category,
      createdAt: Date.now(),
    };

    sessionVault.entries.set(token, entry);
    sessionVault.valueIndex.set(this.getValueKey(category, originalText), token);
    sessionVault.lastAccessAt = entry.createdAt;
  }

  /**
   * Issue a stable token for a session/category/value combination.
   * Reuses an existing token for repeated values in the same session.
   */
  issueToken(sessionId: string, originalText: string, category: string): string {
    const sessionVault = this.getOrCreateSession(sessionId);
    const valueKey = this.getValueKey(category, originalText);
    const existingToken = sessionVault.valueIndex.get(valueKey);

    if (existingToken) {
      sessionVault.lastAccessAt = Date.now();
      return existingToken;
    }

    const nextSequence = (sessionVault.categoryCounters.get(category) ?? 0) + 1;
    sessionVault.categoryCounters.set(category, nextSequence);

    const digest = crypto
      .createHash('sha256')
      .update(`${category}\0${originalText}`)
      .digest('hex')
      .slice(0, 8)
      .toUpperCase();
    const token = `§§${category}_${nextSequence}~${digest}§§`;

    this.store(sessionId, token, originalText, category);
    return token;
  }

  /**
   * Retrieve original text for a token in a session.
   */
  retrieve(sessionId: string, token: string): string | undefined {
    this.pruneExpiredSessions();
    const sessionVault = this.sessions.get(sessionId);
    if (!sessionVault) {
      return undefined;
    }
    sessionVault.lastAccessAt = Date.now();
    const entry = sessionVault.entries.get(token);
    return entry?.originalText;
  }

  /**
   * Get category counts for a session (for tracing).
   */
  getCategoryCounts(sessionId: string): Record<string, number> {
    this.pruneExpiredSessions();
    const sessionVault = this.sessions.get(sessionId);
    if (!sessionVault) {
      return {};
    }
    sessionVault.lastAccessAt = Date.now();
    const counts: Record<string, number> = {};
    for (const entry of sessionVault.entries.values()) {
      counts[entry.category] = (counts[entry.category] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Clear all mappings for a session.
   */
  clearSession(sessionId: string): void {
    this.pruneExpiredSessions();
    this.sessions.delete(sessionId);
  }

  /**
   * Get total number of active sessions.
   */
  getSessionCount(): number {
    this.pruneExpiredSessions();
    return this.sessions.size;
  }

  private getOrCreateSession(sessionId: string): SessionVault {
    this.pruneExpiredSessions();

    let sessionVault = this.sessions.get(sessionId);
    if (!sessionVault) {
      sessionVault = {
        entries: new Map(),
        valueIndex: new Map(),
        categoryCounters: new Map(),
        lastAccessAt: Date.now(),
      };
      this.sessions.set(sessionId, sessionVault);
    }

    sessionVault.lastAccessAt = Date.now();
    return sessionVault;
  }

  private pruneExpiredSessions(): void {
    if (this.sessionTtlMs <= 0) {
      return;
    }

    const now = Date.now();
    for (const [sessionId, sessionVault] of this.sessions.entries()) {
      if (now - sessionVault.lastAccessAt > this.sessionTtlMs) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private getValueKey(category: string, originalText: string): string {
    return `${category}\0${originalText}`;
  }
}
