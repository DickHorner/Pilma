import { describe, it, expect, beforeEach } from 'vitest';
import { Anonymizer } from '../src/companion/anonymizer';
import { Vault } from '../src/companion/vault';

describe('Anonymizer', () => {
  let vault: Vault;
  let anonymizer: Anonymizer;

  beforeEach(() => {
    vault = new Vault();
    anonymizer = new Anonymizer(vault);
  });

  describe('anonymize', () => {
    it('detects and obfuscates email addresses', () => {
      const sessionId = 'session-1';
      const text = 'Contact me at user@example.com for details.';

      const result = anonymizer.anonymize(sessionId, text);

      expect(result.text).not.toContain('user@example.com');
      expect(result.text).toContain('§§EMAIL_1~');
      expect(result.counts.EMAIL).toBe(1);
      expect(result.traceId).toBeDefined();
    });

    it('detects and obfuscates phone numbers', () => {
      const sessionId = 'session-1';
      const text = 'Call me at 123-456-7890 or 555.123.4567';

      const result = anonymizer.anonymize(sessionId, text);

      expect(result.text).not.toContain('123-456-7890');
      expect(result.text).not.toContain('555.123.4567');
      expect(result.text).toContain('§§PHONE_1~');
      expect(result.text).toContain('§§PHONE_2~');
      expect(result.counts.PHONE).toBe(2);
    });

    it('detects and obfuscates SSN', () => {
      const sessionId = 'session-1';
      const text = 'SSN: 123-45-6789';

      const result = anonymizer.anonymize(sessionId, text);

      expect(result.text).not.toContain('123-45-6789');
      expect(result.text).toContain('§§SSN_1~');
      expect(result.counts.SSN).toBe(1);
    });

    it('handles multiple PII types', () => {
      const sessionId = 'session-1';
      const text = 'Email user@example.com, call 123-456-7890, SSN 123-45-6789';

      const result = anonymizer.anonymize(sessionId, text);

      expect(result.text).not.toContain('user@example.com');
      expect(result.text).not.toContain('123-456-7890');
      expect(result.text).not.toContain('123-45-6789');
      expect(result.counts.EMAIL).toBe(1);
      expect(result.counts.PHONE).toBe(1);
      expect(result.counts.SSN).toBe(1);
    });

    it('handles text with no PII', () => {
      const sessionId = 'session-1';
      const text = 'This is a normal message with no sensitive data.';

      const result = anonymizer.anonymize(sessionId, text);

      expect(result.text).toBe(text);
      expect(result.counts).toEqual({});
    });

    it('stores tokens in vault', () => {
      const sessionId = 'session-1';
      const text = 'Email: user@example.com';

      const result = anonymizer.anonymize(sessionId, text);

      // Extract token from obfuscated text
      const tokenMatch = result.text.match(/§§([A-Z_0-9]+~[A-Z0-9]+)§§/);
      expect(tokenMatch).toBeTruthy();

      const token = `§§${tokenMatch![1]}§§`;
      const retrieved = vault.retrieve(sessionId, token);
      expect(retrieved).toBe('user@example.com');
    });

    it('reuses the same token for repeated values in a session', () => {
      const sessionId = 'session-1';
      const text = 'Email user@example.com and again user@example.com';

      const result = anonymizer.anonymize(sessionId, text);
      const matches = result.text.match(/§§EMAIL_1~[A-Z0-9]+§§/g);

      expect(matches).toHaveLength(2);
      expect(matches?.[0]).toBe(matches?.[1]);
      expect(result.counts.EMAIL).toBe(2);
    });
  });

  describe('deanonymize', () => {
    it('restores obfuscated email addresses', () => {
      const sessionId = 'session-1';
      const originalText = 'Contact me at user@example.com for details.';

      const anonymizeResult = anonymizer.anonymize(sessionId, originalText);
      const deanonymizeResult = anonymizer.deanonymize(sessionId, anonymizeResult.text);

      expect(deanonymizeResult.text).toBe(originalText);
    });

    it('restores multiple PII items', () => {
      const sessionId = 'session-1';
      const originalText = 'Email user@example.com, call 123-456-7890';

      const anonymizeResult = anonymizer.anonymize(sessionId, originalText);
      const deanonymizeResult = anonymizer.deanonymize(sessionId, anonymizeResult.text);

      expect(deanonymizeResult.text).toBe(originalText);
    });

    it('handles text with no tokens', () => {
      const sessionId = 'session-1';
      const text = 'This is a normal message.';

      const result = anonymizer.deanonymize(sessionId, text);

      expect(result.text).toBe(text);
    });

    it('leaves tokens as-is if not found in vault', () => {
      const sessionId = 'session-1';
      const text = 'Token §§EMAIL_1~ABCD§§ not in vault';

      const result = anonymizer.deanonymize(sessionId, text);

      expect(result.text).toBe(text);
    });

    it('restores tokens in different sessions independently', () => {
      const text1 = 'Email user1@example.com';
      const text2 = 'Email user2@example.com';

      const result1 = anonymizer.anonymize('session-1', text1);
      const result2 = anonymizer.anonymize('session-2', text2);

      const restored1 = anonymizer.deanonymize('session-1', result1.text);
      const restored2 = anonymizer.deanonymize('session-2', result2.text);

      expect(restored1.text).toBe(text1);
      expect(restored2.text).toBe(text2);
    });
  });

  describe('roundtrip', () => {
    it('preserves original text through anonymize/deanonymize cycle', () => {
      const sessionId = 'session-1';
      const originalTexts = [
        'Email: user@example.com',
        'Phone: 123-456-7890',
        'SSN: 123-45-6789',
        'Multiple: user@example.com, 555-123-4567, admin@test.org',
        'No PII here!',
      ];

      for (const original of originalTexts) {
        const anonymized = anonymizer.anonymize(sessionId, original);
        const restored = anonymizer.deanonymize(sessionId, anonymized.text);
        expect(restored.text).toBe(original);
      }
    });
  });
});
