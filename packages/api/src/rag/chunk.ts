// rag/chunk.ts — text chunking for embedding (#36).
//
// Pure function only: no config, no DB, no Ollama. Paragraphs are greedily
// packed up to CHUNK_MAX_CHARS; a paragraph larger than the limit is
// hard-split at char boundaries (embedding models degrade badly past ~8k
// tokens, so no chunk may outgrow the limit regardless of structure). Each
// chunk after the first is preceded by the last CHUNK_OVERLAP_CHARS of the
// previous chunk's primary text (its own overlap excluded, so overlap never
// accumulates). TextChunk is the ingest consumer's contract — changing it
// means changing rag/ingest.ts.

// Chunking thresholds (characters, not tokens — UTF-16 code units, i.e. the
// JS string .length, so behaviour is deterministic for any input)
const CHUNK_MAX_CHARS     = 1200; // primary chunk size ceiling (the fixed
                                 // overlap of the next chunk rides on top)
const CHUNK_OVERLAP_CHARS = 200;  // tail of prev chunk prepended as context

export interface TextChunk {
  index:      number;
  content:    string;
  tokenCount: number;
}

export function chunkText(text: string): TextChunk[] {
  if (!text.trim()) {return [];}

  // Handles \n\n, \r\n\r\n, or any line that is entirely whitespace.
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Greedy pack; a paragraph alone exceeding the limit is sliced at hard char
  // boundaries (no sentence logic — chunk text does not need to be
  // grammatically whole).
  const primary: string[] = [];
  let buffer = '';

  for (const para of paragraphs) {
    if (buffer.length > 0) {
      if (buffer.length + 2 + para.length <= CHUNK_MAX_CHARS) {
        buffer += '\n\n' + para;
        continue;
      }
      primary.push(buffer);
      buffer = '';
    }
    if (para.length > CHUNK_MAX_CHARS) {
      for (let i = 0; i < para.length; i += CHUNK_MAX_CHARS) {
        primary.push(para.slice(i, i + CHUNK_MAX_CHARS));
      }
    } else {
      buffer = para;
    }
  }
  if (buffer.length > 0) {
    primary.push(buffer);
  }

  return primary.map((p, i) => {
    const previous = i > 0 ? primary[i - 1].slice(-CHUNK_OVERLAP_CHARS) : '';
    const content  = previous ? previous + '\n\n' + p : p;
    return {
      index:      i,
      content:    content.trim(),
      tokenCount: Math.ceil(content.trim().length / 4),
    };
  });
}
