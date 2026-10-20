/**
 * Unit tests for rag/chunk.ts — the pure chunking pipeline.
 * Covers: empty input, short-paragraph forward merging, sentence-level splits
 * of oversized blocks, the soft overlap tail, and index continuity.
 */
import { chunkText } from '../../src/rag/chunk';

describe('chunkText', () => {
  it('returns [] for empty or whitespace-only text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  \t ')).toEqual([]);
  });

  it('returns one chunk for short text, with a 1/4-char token estimate', () => {
    const chunks = chunkText('The quick brown fox jumps over the lazy dog.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      index: 0,
      content: 'The quick brown fox jumps over the lazy dog.',
      tokenCount: Math.ceil('The quick brown fox jumps over the lazy dog.'.length / 4),
    });
  });

  it('merges short paragraphs forward until one reaches CHUNK_MIN_CHARS', () => {
    // Three short paragraphs (below the 400 merge threshold each) must land in
    // the same chunk, separated by blank lines, in order.
    const text = 'alpha paragraph\n\nbeta paragraph\n\ngamma paragraph';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(
      'alpha paragraph\n\nbeta paragraph\n\ngamma paragraph',
    );
  });

  it('preserves paragraph order and indexes chunks 0..n-1', () => {
    const longPara = 'A'.repeat(500) + '.';   // 501 chars — self-sufficient
    const bigger = 'B'.repeat(500) + '.';
    const text = [longPara, bigger].join('\n\n');
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((c, i) => { expect(c.index).toBe(i); });
    expect(chunks[1].content).toContain('B');
  });

  it('never starts a chunk mid-sentence when splitting oversized blocks', () => {
    // One oversized run-on block: many sentences separated by single spaces.
    const sentence = 'This is a fairly long sentence with several words in it.';
    const block = Array.from({ length: 60 }, () => sentence).join(' ');
    const chunks = chunkText(block);

    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      // Every chunk must end where a sentence ends (oversized single-block
      // mode) and must respect the size ceiling (primary ≤ ~TARGET + 200-char
      // overlap + separator).
      expect(c.content.endsWith('.')).toBe(true);
      expect(c.content.length).toBeLessThanOrEqual(1800 + 200);
    }
    for (const c of chunks.slice(1)) {
      // The PRIMARY text (everything after the overlap's blank-line separator)
      // must start at a sentence boundary — never mid-sentence.
      const primaryAfterOverlap = c.content.split('\n\n')[1] ?? '';
      expect(primaryAfterOverlap.startsWith('This')).toBe(true);
      expect(c.content.includes('\n\n')).toBe(true);
    }
  });

  it('prepends the previous chunk tail as overlap (except the first)', () => {
    const midPara = 'M'.repeat(500) + '.';
    const lastPara = 'Z'.repeat(500) + '.';
    const text = [midPara, lastPara].join('\n\n');
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    const last = chunks[chunks.length - 1];
    // The tail of the previous *primary* text is prepended with a blank line.
    const expectedTail = midPara.length > 200 ? midPara.slice(-200) : midPara;
    expect(last.content.startsWith(expectedTail)).toBe(true);
    expect(last.content.includes('\n\n')).toBe(true);
  });

  it('does not accumulate overlap-of-overlap across many chunks', () => {
    const para = () => 'S'.repeat(500) + '.';
    const text = Array.from({ length: 6 }, para).join('\n\n');
    const chunks = chunkText(text);
    // With 200-char overlap the first chunk is ~500 chars; each next chunk is
    // at most primary(≈500) + overlap(200 + separator) — far below 800 + slack.
    for (const c of chunks.slice(1)) {
      expect(c.content.length).toBeLessThan(900);
    }
  });

  it('tokenCount tracks content length (ceil /4)', () => {
    const text = `${'word '.repeat(100)}end.`;
    const [chunk] = chunkText(text);
    expect(chunk.tokenCount).toBe(Math.ceil(chunk.content.length / 4));
  });

  it('is deterministic for identical input', () => {
    const text = 'a\n\n'.repeat(30) + 'b';
    const a = chunkText(text);
    const b = chunkText(text);
    expect(a).toEqual(b);
  });
});
