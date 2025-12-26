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
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    let obfuscatedText = text;
    const categoryCounts: Record<string, number> = {};

    // Process each PII pattern
    for (const pattern of PII_PATTERNS) {
      const matches = Array.from(text.matchAll(pattern.regex));
      
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const originalText = match[0];
        
        // Generate stable token
        const tokenId = `${pattern.category}_${i + 1}`;
        const hash = this.simpleHash(originalText);
        const token = `§§${tokenId}~${hash}§§`;

        // Store in vault
        this.vault.store(sessionId, token, originalText, pattern.category);

        // Replace in text
        obfuscatedText = obfuscatedText.replace(originalText, token);

        // Update counts
        categoryCounts[pattern.category] = (categoryCounts[pattern.category] ?? 0) + 1;
      }
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

  /**
   * Simple hash function for token generation.
   * Creates a short alphanumeric hash of the input.
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).toUpperCase().substr(0, 4);
  }
}
