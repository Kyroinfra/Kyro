/**
 * Unit test for rag/ollama.ts embed() — real HTTP batching (#36).
 *
 * A stub HTTP server stands in for Ollama and COUNTS the requests it
 * receives. Done-when: a 100-chunk file sliced by EMBED_BATCH_SIZE (32,
 * the rag/ingest policy) reaches Ollama in exactly ⌈100 / 32⌉ = 4 HTTP
 * requests, with embeddings returned in input order.
 *
 * config reads OLLAMA_URL at import time, so the module is loaded through a
 * fresh module registry (jest.resetModules + dynamic import) AFTER the stub
 * server is listening and the env var is pointed at it.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';

interface RecordedRequest {
  path: string;
  body: { model?: string; input?: string[] };
}

const received: RecordedRequest[] = [];
let server: http.Server;

// The stub: answers /api/embed with one zero-vector per input element —
// only the request shape/count and order matter here, not dimensionality.
beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
    req.on('end', () => {
      let body: RecordedRequest['body'] = {};
      try { body = JSON.parse(raw); } catch { /* malformed body is a test error */ }
      received.push({ path: req.url ?? '', body });

      res.setHeader('Content-Type', 'application/json');
      const n = Array.isArray(body.input) ? body.input.length : 0;
      res.end(JSON.stringify({
        model:      body.model ?? '',
        embeddings: Array.from({ length: n }, () => [0, 0]),
      }));
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => { resolve(); });
  });

  const port = (server.address() as AddressInfo).port;
  process.env.OLLAMA_URL = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => { server.close(() => { resolve(); }); });
});

const loadEmbed = async () => {
  jest.resetModules();
  // Dynamic import (not `return await import`) — the await is redundant
  // inside an async function (eslint no-return-await) and the fresh module
  // registry is what matters for config's import-time OLLAMA_URL read.
  return import('../../src/rag/ollama');
};

describe('embed() HTTP batching', () => {
  it('sends ⌈100 / 32⌉ = 4 requests for a 100-chunk file', async () => {
    received.length = 0;
    const { embed } = await loadEmbed();

    const texts = Array.from({ length: 100 }, (_, i) => `chunk text ${i}`);
    // Exactly the batching rag/ingest.ts performs (EMBED_BATCH_SIZE = 32):
    for (let i = 0; i < texts.length; i += 32) {
      await embed(texts.slice(i, i + 32));
    }

    const embedRequests = received.filter(r => r.path === '/api/embed');
    expect(embedRequests).toHaveLength(Math.ceil(100 / 32)); // 4, not 100

    // Every request carries the whole ≤32-text slice as one input array.
    expect(embedRequests.map(r => Array.isArray(r.body.input) && r.body.input.length))
      .toEqual([32, 32, 32, 4]);
  });

  it('returns embeddings in input order in a single request', async () => {
    received.length = 0;
    const { embed } = await loadEmbed();

    const out = await embed(['first', 'second', 'third']);

    expect(out).toHaveLength(3);
    expect(received).toHaveLength(1);                       // one HTTP call
    expect(received[0].body.input).toEqual(['first', 'second', 'third']);
  });

  it('rejects a response whose arity mismatches the input', async () => {
    const { embed } = await loadEmbed();

    const spy = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(
        JSON.stringify({ model: 'm', embeddings: [[0, 0]] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )),
    );
    try {
      await expect(embed(['a', 'b'])).rejects.toThrow(
        'Ollama /api/embed returned 1 embeddings for 2 inputs',
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('surfaces unreachable-Ollama errors with the module error shape', async () => {
    const stubPort = (server.address() as AddressInfo).port;

    // Re-import against a dead port: config re-reads OLLAMA_URL on every
    // loadEmbed()'s fresh module registry.
    process.env.OLLAMA_URL = 'http://127.0.0.1:58999';
    const { embed } = await loadEmbed();
    try {
      await expect(embed(['a'])).rejects.toThrow('Ollama /api/embed');
    } finally {
      process.env.OLLAMA_URL = `http://127.0.0.1:${stubPort}`;
    }
  });
});
