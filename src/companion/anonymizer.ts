import crypto from 'crypto';
import { Vault } from './vault';
import { logTrace } from '../tracing/trace';

/**
 * Minimal PII detection and anonymization logic.
 * For PR1, we use simple regex patterns. 
 * PR2 will integrate the HuggingFace model.
 */

export type AnonymizeResult = {
  text: string; // obfuscated text with tokens
  counts: Record<string, number>; // category counts
  traceId: string;
};

export type DeanonymizeResult = {
  text: string; // restored text
};

/**
 * Simple PII patterns for baseline implementation.
 * These will be replaced with model-based detection in PR2.
 */
const PII_PATTERNS = [
  {
    category: 'EMAIL',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  },
  {
    category: 'PHONE',
    regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  },
  {
    category: 'SSN',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
];

export class Anonymizer {
  private vault: Vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  /**
   * Anonymize text by detecting and replacing PII with stable tokens.
   */
  anonymize(sessionId: string, text: string): AnonymizeResult {
    const traceId = `trace-${crypto.randomUUID()}`;
    const startTime = Date.now();
    const categoryCounts: Record<string, number> = {};
    let obfuscatedText = text;

    for (const pattern of PII_PATTERNS) {
      obfuscatedText = obfuscatedText.replace(pattern.regex, (match) => {
        const token = this.vault.issueToken(sessionId, match, pattern.category);
        categoryCounts[pattern.category] = (categoryCounts[pattern.category] ?? 0) + 1;
        return token;
      });
    }

    const finishTime = Date.now();

    // Log trace (PII-safe)
    logTrace({
      request_id: traceId,
      input_length: text.length,
      category_counts: categoryCounts,
      started_at: startTime,
      finished_at: finishTime,
      duration_ms: finishTime - startTime,
    });

    return {
      text: obfuscatedText,
      counts: categoryCounts,
      traceId,
    };
  }

  /**
   * Deanonymize text by replacing tokens with original PII from vault.
   */
  deanonymize(sessionId: string, text: string): DeanonymizeResult {
    let restoredText = text;

    // Find all tokens in the text (format: §§TOKEN~HASH§§)
    const tokenPattern = /§§([A-Z_0-9]+)~([A-Z0-9]+)§§/g;
    const matches = Array.from(text.matchAll(tokenPattern));

    for (const match of matches) {
      const token = match[0];
      const originalText = this.vault.retrieve(sessionId, token);

      if (originalText) {
        restoredText = restoredText.replace(token, originalText);
      }
      // If not found in vault, leave token as-is (defensive)
    }

    return {
      text: restoredText,
    };
  }
}
