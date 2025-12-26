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

export class Vault {
  private sessions: Map<string, Map<string, VaultEntry>>;

  constructor() {
    this.sessions = new Map();
  }

  /**
   * Store a PII mapping for a given session.
   */
  store(sessionId: string, token: string, originalText: string, category: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Map());
    }
    const sessionVault = this.sessions.get(sessionId)!;
    sessionVault.set(token, {
      token,
      originalText,
      category,
      createdAt: Date.now(),
    });
  }

  /**
   * Retrieve original text for a token in a session.
   */
  retrieve(sessionId: string, token: string): string | undefined {
    const sessionVault = this.sessions.get(sessionId);
    if (!sessionVault) {
      return undefined;
    }
    const entry = sessionVault.get(token);
    return entry?.originalText;
  }

  /**
   * Get category counts for a session (for tracing).
   */
  getCategoryCounts(sessionId: string): Record<string, number> {
    const sessionVault = this.sessions.get(sessionId);
    if (!sessionVault) {
      return {};
    }
    const counts: Record<string, number> = {};
    for (const entry of sessionVault.values()) {
      counts[entry.category] = (counts[entry.category] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Clear all mappings for a session.
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get total number of active sessions.
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}
