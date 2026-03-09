import { describe, expect, it } from 'vitest';
import { getStartupMessages, resolveStartupConfig } from '../src/companion/startup';

describe('startup configuration', () => {
  it('requires an explicit secret', () => {
    expect(() =>
      resolveStartupConfig({
        PORT: '8787',
        HOST: '127.0.0.1',
      })
    ).toThrow('Missing SECRET environment variable');
  });

  it('rejects empty secrets', () => {
    expect(() =>
      resolveStartupConfig({
        PORT: '8787',
        HOST: '127.0.0.1',
        SECRET: '   ',
      })
    ).toThrow('Missing SECRET environment variable');
  });

  it('uses explicit secret and loopback defaults', () => {
    expect(
      resolveStartupConfig({
        SECRET: 'test-shared-credential',
      })
    ).toEqual({
      port: 8787,
      host: '127.0.0.1',
      secret: 'test-shared-credential',
    });
  });

  it('rejects invalid ports', () => {
    expect(() =>
      resolveStartupConfig({
        PORT: 'abc',
        SECRET: 'test-shared-credential',
      })
    ).toThrow('Invalid PORT value');
  });
});

describe('startup messages', () => {
  it('does not include the shared secret in output', () => {
    const messages = getStartupMessages();

    expect(messages).toContain('Companion service started successfully.');
    expect(messages.join(' ')).not.toContain('test-shared-credential');
    expect(messages.join(' ').toLowerCase()).not.toContain('copy this secret');
  });
});
