// rag/chunk.ts — text chunking for embedding
//
// Pure functions only: no config, no DB, no Ollama. The 4-stage pipeline is
// deliberately identical to the one that shipped with the original embedder;
// #36 will reimplement it (issue requirement: keep behavior, gain tests).
//
// Stage 1 — split on paragraph boundaries
// Stage 2 — merge short paragraphs forward (keeps related clauses together)
// Stage 3 — split oversized blocks at sentence boundaries
// Stage 4 — prepend a soft overlap of the previous chunk's tail

// Chunking thresholds (characters, not tokens)
const CHUNK_TARGET_CHARS  = 1200; // aim for this size per chunk
const CHUNK_MIN_CHARS     = 400;  // below this, merge with the next paragraph
const CHUNK_MAX_CHARS     = 1800; // above this, force a sentence-level split
const CHUNK_OVERLAP_CHARS = 200;  // tail of prev chunk prepended as context

export interface TextChunk {
  index:      number;
  content:    string;
  tokenCount: number;
}

export function chunkText(text: string): TextChunk[] {
  if (!text.trim()) {return [];}

  // ── 1. Split on paragraph boundaries ──────────────────────────────────────
  // Handles \n\n, \r\n\r\n, or any line that is entirely whitespace.
  const rawParagraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // ── 2. Merge short paragraphs forward ─────────────────────────────────────
  // Walk forward: while the accumulated buffer is below CHUNK_MIN_CHARS, keep
  // appending the next paragraph. This keeps related short clauses together
  // (e.g. numbered legal sub-clauses, citation lines, figure captions).
  const merged: string[] = [];
  let buffer = '';

  for (const para of rawParagraphs) {
    if (buffer.length === 0) {
      buffer = para;
    } else if (buffer.length < CHUNK_MIN_CHARS) {
      buffer += '\n\n' + para;
    } else {
      merged.push(buffer);
      buffer = para;
    }
  }
  if (buffer.length > 0) {
    merged.push(buffer);
  }

  // ── 3. Split oversized blocks at sentence boundaries ──────────────────────
  // A paragraph that exceeds CHUNK_MAX_CHARS is split greedily: sentences are
  // accumulated until adding the next one would exceed CHUNK_TARGET_CHARS,
  // at which point the current accumulator is flushed and a new one starts.
  const sized: string[] = [];

  for (const block of merged) {
    if (block.length <= CHUNK_MAX_CHARS) {
      sized.push(block);
      continue;
    }

    // Match sequences ending with sentence-terminating punctuation.
    // Keeps ". " boundaries intact without stripping the period.
    const sentences = block.match(/[^.!?]+[.!?]*/g) ?? [block];
    let current = '';

    for (const sentence of sentences) {
      const s = sentence.trim();
      if (!s) {continue;}

      if (current.length > 0 && current.length + 1 + s.length > CHUNK_TARGET_CHARS) {
        sized.push(current.trim());
        current = s;
      } else {
        current = current ? current + ' ' + s : s;
      }
    }
    if (current.trim()) {
      sized.push(current.trim());
    }
  }

  // ── 4. Build final chunks with soft overlap ────────────────────────────────
  // Each chunk begins with the tail of the previous chunk (CHUNK_OVERLAP_CHARS)
  // so that a sentence split mid-way between two chunks does not lose context.
  // The overlap is prepended as genuine text; the primary paragraph boundary is
  // still honoured — the chunk does not start mid-sentence.
  const chunks: TextChunk[] = [];
  let previousTail = '';

  for (let i = 0; i < sized.length; i++) {
    const primary = sized[i];
    const content = previousTail
      ? previousTail + '\n\n' + primary
      : primary;

    const trimmed = content.trim();
    chunks.push({
      index:      i,
      content:    trimmed,
      tokenCount: Math.ceil(trimmed.length / 4),
    });

    // Capture the tail of *primary* (not the full content including overlap)
    // so we don't accumulate overlap-of-overlap across many chunks.
    previousTail = primary.length > CHUNK_OVERLAP_CHARS
      ? primary.slice(-CHUNK_OVERLAP_CHARS)
      : primary;
  }

  return chunks;
}
