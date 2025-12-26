import { describe, it, expect } from 'vitest';
import { Vault } from '../src/companion/vault';

describe('Vault', () => {
  it('stores and retrieves PII mappings', () => {
    const vault = new Vault();
    const sessionId = 'session-1';
    const token = '§§EMAIL_1~ABCD§§';
    const originalText = 'user@example.com';
    const category = 'EMAIL';

    vault.store(sessionId, token, originalText, category);

    const retrieved = vault.retrieve(sessionId, token);
    expect(retrieved).toBe(originalText);
  });

  it('returns undefined for non-existent tokens', () => {
    const vault = new Vault();
    const sessionId = 'session-1';
    const token = '§§EMAIL_1~ABCD§§';

    const retrieved = vault.retrieve(sessionId, token);
    expect(retrieved).toBeUndefined();
  });

  it('returns undefined for non-existent sessions', () => {
    const vault = new Vault();
    const token = '§§EMAIL_1~ABCD§§';

    const retrieved = vault.retrieve('non-existent', token);
    expect(retrieved).toBeUndefined();
  });

  it('provides category counts for a session', () => {
    const vault = new Vault();
    const sessionId = 'session-1';

    vault.store(sessionId, '§§EMAIL_1~ABCD§§', 'user@example.com', 'EMAIL');
    vault.store(sessionId, '§§EMAIL_2~EFGH§§', 'admin@example.com', 'EMAIL');
    vault.store(sessionId, '§§PHONE_1~IJKL§§', '123-456-7890', 'PHONE');

    const counts = vault.getCategoryCounts(sessionId);
    expect(counts).toEqual({
      EMAIL: 2,
      PHONE: 1,
    });
  });

  it('clears session data', () => {
    const vault = new Vault();
    const sessionId = 'session-1';
    const token = '§§EMAIL_1~ABCD§§';

    vault.store(sessionId, token, 'user@example.com', 'EMAIL');
    expect(vault.retrieve(sessionId, token)).toBe('user@example.com');

    vault.clearSession(sessionId);
    expect(vault.retrieve(sessionId, token)).toBeUndefined();
    expect(vault.getSessionCount()).toBe(0);
  });

  it('tracks session count', () => {
    const vault = new Vault();

    expect(vault.getSessionCount()).toBe(0);

    vault.store('session-1', '§§EMAIL_1~ABCD§§', 'user@example.com', 'EMAIL');
    expect(vault.getSessionCount()).toBe(1);

    vault.store('session-2', '§§EMAIL_1~ABCD§§', 'admin@example.com', 'EMAIL');
    expect(vault.getSessionCount()).toBe(2);

    vault.clearSession('session-1');
    expect(vault.getSessionCount()).toBe(1);
  });

  it('isolates sessions', () => {
    const vault = new Vault();
    const token = '§§EMAIL_1~ABCD§§';

    vault.store('session-1', token, 'user1@example.com', 'EMAIL');
    vault.store('session-2', token, 'user2@example.com', 'EMAIL');

    expect(vault.retrieve('session-1', token)).toBe('user1@example.com');
    expect(vault.retrieve('session-2', token)).toBe('user2@example.com');
  });
});
