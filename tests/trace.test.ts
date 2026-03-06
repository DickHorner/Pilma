import { describe, it, expect, vi } from 'vitest';
import { logTrace } from '../src/tracing/trace';

describe('tracing skeleton', () => {
  it('emits structured JSON without raw text', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Intentionally include a raw field; logger must strip it
    const event = {
      request_id: 'req-123',
      model_id: 'iiiorg/piiranha-v1-detect-personal-information',
      chunk_count: 2,
      input_length: 42,
      category_counts: { name: 1, email: 1 },
      started_at: Date.now(),
      finished_at: Date.now() + 10,
      duration_ms: 10,
      raw_text: 'SHOULD_NOT_APPEAR',
    } as {
      request_id: string;
      model_id: string;
      chunk_count: number;
      input_length: number;
      category_counts: Record<string, number>;
      started_at: number;
      finished_at: number;
      duration_ms: number;
      raw_text: string;
    };

    logTrace(event);

    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0][0];
    const parsed = JSON.parse(arg);
    expect(parsed.type).toBe('trace');
    expect(parsed.payload.request_id).toBe('req-123');
    expect(parsed.payload.input_length).toBe(42);
    expect(parsed.payload.category_counts).toEqual({ name: 1, email: 1 });
    expect(parsed.payload.raw_text).toBeUndefined();

    spy.mockRestore();
  });
});
