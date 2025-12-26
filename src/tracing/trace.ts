export type TraceEvent = {
  request_id: string;
  model_id?: string;
  chunk_count?: number;
  input_length?: number; // characters length only
  category_counts?: Record<string, number>; // e.g., { name: 2, email: 1 }
  started_at?: number; // ms epoch
  finished_at?: number; // ms epoch
  duration_ms?: number;
};

/**
 * Serialize a trace event to structured JSON and emit to stdout.
 * Never include raw text; only lengths and category counts.
 */
export function logTrace(event: TraceEvent): void {
  const sanitized: TraceEvent = {
    request_id: event.request_id,
    model_id: event.model_id,
    chunk_count: event.chunk_count,
    input_length: event.input_length,
    category_counts: event.category_counts ?? {},
    started_at: event.started_at,
    finished_at: event.finished_at,
    duration_ms: event.duration_ms,
  };

  // Defensive: remove any accidental raw fields
  const anyEvent = sanitized as unknown as Record<string, unknown>;
  delete anyEvent.raw;
  delete anyEvent.raw_text;
  delete anyEvent.input_text;

  // Emit structured JSON only
  // Use console.log; in future we can wire to a proper logger/sink.
  console.log(JSON.stringify({ type: 'trace', payload: sanitized }));
}
