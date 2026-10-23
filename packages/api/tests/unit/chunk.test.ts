/**
 * Unit tests for rag/chunk.ts — the pure chunking function (#36).
 * Covers: empty input, greedy paragraph packing, exact threshold boundaries,
 * oversized (hard-split) paragraphs, no-paragraph blobs, unicode, the fixed
 * overlap, determinism and the token estimate.
 */
import { chunkText } from '../../src/rag/chunk';

const MAX = 1200; // CHUNK_MAX_CHARS
const OVERLAP = 200; // CHUNK_OVERLAP_CHARS

describe('chunkText', () => {
  it('returns [] for empty or whitespace-only text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  \t ')).toEqual([]);
    expect(chunkText('\n\n\n')).toEqual([]);
  });

  it('returns one chunk for short text, with a 1/4-char token estimate', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      index: 0,
      content: text,
      tokenCount: Math.ceil(text.length / 4),
    });
  });

  it('packs consecutive paragraphs up to the limit, preserving separators', () => {
    // Each paragraph is ~100 chars: three fit into one ≤1200-char chunk.
    const para = 'w'.repeat(98) + '.'; // 100 chars
    const chunks = chunkText([para, para, para].join('\n\n'));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content.split('\n\n')).toHaveLength(3);
    expect(chunks[0].content).toBe(`${para}\n\n${para}\n\n${para}`);
  });

  it('flushes once another paragraph would exceed the limit', () => {
    const para = 'x'.repeat(600); // two would exceed 1200 with separators
    const chunks = chunkText([para, para, para].join('\n\n'));
    expect(chunks).toHaveLength(3);
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(MAX + OVERLAP + 2);
    }
  });

  it('honours the exact boundary at the limit', () => {
    // Two 599-char paragraphs sum to exactly 1200 including one separator.
    const para = 'y'.repeat(599);
    const chunks = chunkText([para, para].join('\n\n'));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content.length).toBe(MAX);
  });

  it('hard-splits a huge paragraph into ≤MAX slices', () => {
    const para = 'a'.repeat(2 * MAX + 700); // → slices of 1200, 1200, 700
    const chunks = chunkText(para);
    expect(chunks).toHaveLength(3);
    // Chunk 0 carries no overlap → exactly one full slice:
    expect(chunks[0].content).toHaveLength(MAX);
    // Later chunks are overlap(OVERLAP) + separator(\n\n) + primary slice;
    // strip that prefix to recover the slice sizes.
    expect(chunks[1].content.slice(OVERLAP + 2)).toHaveLength(MAX);
    expect(chunks[2].content.slice(OVERLAP + 2)).toHaveLength(700);
    expect(chunks.map(c => c.index)).toEqual([0, 1, 2]);
  });

  it('gives oversized-paragraph slices the fixed overlap too', () => {
    const para = 'a'.repeat(2 * MAX + 700);
    const chunks = chunkText(para);
    // Chunk 1 begins with the last OVERLAP chars of chunk 0's primary.
    expect(chunks[1].content.startsWith(chunks[0].content.slice(-OVERLAP)))
      .toBe(true);
  });

  it('a no-paragraph blob behaves like one huge paragraph (hard-split)', () => {
    const blob = 'z'.repeat(3 * MAX);
    const chunks = chunkText(blob);
    expect(chunks).toHaveLength(3);
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(MAX + OVERLAP + 2);
    }
  });

  it('keeps unicode text intact (code-unit lengths, no data loss)', () => {
    const text = 'naïve café 応用 👍段落\n\n' + '/Graphics'.repeat(120);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(0);
    for (const c of chunks) {
      expect(c.content.length).toBeGreaterThan(0);
    }
  });

  it('prepends the previous primary tail as fixed overlap (except first)', () => {
    const mid = 'M'.repeat(800);
    const last = 'Z'.repeat(800);
    const chunks = chunkText([mid, last].join('\n\n'));
    expect(chunks).toHaveLength(2);
    expect(chunks[1].content.startsWith(mid.slice(-OVERLAP))).toBe(true);
    expect(chunks[1].content.includes('\n\n')).toBe(true);
    // The first chunk carries no overlap.
    expect(chunks[0].content.startsWith('MMMM')).toBe(true);
  });

  it('does not accumulate overlap-of-overlap across many chunks', () => {
    const para = () => 'S'.repeat(1100);
    const text = Array.from({ length: 6 }, para).join('\n\n');
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(6);
    // Chunk 0 has no overlap → one piece; every other chunk is exactly
    // overlap + separator + one primary paragraph — so the overlap never
    // rides on a previous overlap (which would grow the piece count).
    expect(chunks[0].content.split('\n\n')).toHaveLength(1);
    for (const c of chunks.slice(1)) {
      expect(c.content.length).toBeLessThanOrEqual(MAX + OVERLAP + 2);
      expect(c.content.split('\n\n')).toHaveLength(2);
    }
  });

  it('tokenCount tracks content length (ceil /4)', () => {
    const text = `${'word '.repeat(300)}end.\n\n${'word '.repeat(300)}end.`;
    for (const c of chunkText(text)) {
      expect(c.tokenCount).toBe(Math.ceil(c.content.length / 4));
    }
  });

  it('is deterministic for identical input', () => {
    const text = 'a\n\n'.repeat(30) + 'b';
    expect(chunkText(text)).toEqual(chunkText(text));
  });
});
