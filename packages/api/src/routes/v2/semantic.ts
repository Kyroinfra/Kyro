import { Router, Response } from 'express';
import { db } from '../../db';
import pool from '../../db';           // raw pg Pool — default export
import { collections, collectionFiles } from "../../db/schema"
import { files, fileChunks } from '../../db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { ApiKeyRequest, requireScope } from '../../middleware/apiKeyAuth';
import { embedQuery, embedFile } from '../../lib/embeddings';
import { z } from 'zod';

const router = Router();

router.use((req, res, next) => {
    console.log('semanticRouter hit:', req.method, req.path);
    next();
});

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const CHAT_MODEL = process.env.CHAT_MODEL ?? 'llama3.2';

async function resolveCollectionToFileIds(
    collectionId: string,
    orgId: string,
): Promise<string[] | null> {
    // Returns null if the collection doesn't exist or belongs to another org
    const [col] = await db
        .select({ id: collections.id })
        .from(collections)
        .where(and(eq(collections.id, collectionId), eq(collections.orgId, orgId)));

    if (!col) return null;

    const rows = await db
        .select({ fileId: collectionFiles.fileId })
        .from(collectionFiles)
        .where(eq(collectionFiles.collectionId, collectionId));

    return rows.map(r => r.fileId);
}

router.get('/semantic-search', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
    try {
        const orgId = req.orgId!;
        const q = (req.query.q as string | undefined)?.trim();

        if (!q) {
            res.status(400).json({ error: 'Query parameter "q" is required' });
            return;
        }

        if (!process.env.OLLAMA_URL) {
            res.status(400).json({ error: 'OLLAMA_URL must be configured for semantic search' });
            return;
        }

        const limit = Math.min(parseInt((req.query.limit as string) || '10', 10), 50);
        const minScore = parseFloat((req.query.min_score as string) || '0.3');

        // let fileIdFilter: string[] | undefined;
        // if (req.query.file_ids) {
        //     fileIdFilter = (req.query.file_ids as string)
        //         .split(',').map(s => s.trim()).filter(Boolean);
        //     if (fileIdFilter.length === 0) fileIdFilter = undefined;
        // }


        async function resolveFileIdFilter(
            req: ApiKeyRequest,
            orgId: string,
        ): Promise<{ fileIds: string[] | undefined; error?: string }> {
            const hasCollectionId = !!req.query.collection_id;
            const hasFileIds = !!req.query.file_ids;

            if (hasCollectionId && hasFileIds) {
                return { fileIds: undefined, error: 'Provide either collection_id or file_ids, not both' };
            }

            if (hasCollectionId) {
                const ids = await resolveCollectionToFileIds(req.query.collection_id as string, orgId);
                if (ids === null) {
                    return { fileIds: undefined, error: 'Collection not found' };
                }
                if (ids.length === 0) {
                    return { fileIds: undefined, error: 'Collection has no files' };
                }
                return { fileIds: ids };
            }

            if (hasFileIds) {
                const ids = (req.query.file_ids as string)
                    .split(',').map(s => s.trim()).filter(Boolean);
                return { fileIds: ids.length > 0 ? ids : undefined };
            }

            return { fileIds: undefined }; // search across entire org
        }

        const queryVec = await embedQuery(q);
        const vectorLiteral = `[${queryVec.join(',')}]`;


        const { fileIds: fileIdFilter, error: filterError } = await resolveFileIdFilter(req, orgId);
        if (filterError) {
            res.status(400).json({ error: filterError });
            return;
        }

        // Build query using raw pool — Drizzle's sql tag breaks ::vector casts
        const params: unknown[] = [orgId, vectorLiteral, minScore, limit];
        const fileFilterClause = fileIdFilter && fileIdFilter.length > 0
            ? `AND fc.file_id = ANY($5::uuid[])`
            : '';
        if (fileIdFilter && fileIdFilter.length > 0) {
            params.push(fileIdFilter);
        }

        const rawSql = `
            SELECT
                fc.file_id         AS "fileId",
                f.name             AS "fileName",
                fc.chunk_index     AS "chunkIndex",
                fc.content,
                (1 - (fc.embedding <=> $2::vector))::float4 AS score
            FROM file_chunks fc
            JOIN files f ON f.id = fc.file_id
            WHERE
                fc.org_id    = $1
                AND f.deleted_at IS NULL
                ${fileFilterClause}
                AND (1 - (fc.embedding <=> $2::vector)) >= $3
            ORDER BY fc.embedding <=> $2::vector
            LIMIT $4
        `;

        const result = await pool.query(rawSql, params);

        res.json({
            data: result.rows,
            query: q,
            limit,
        });
    } catch (error: any) {
        console.error('Error in semantic-search:', error);
        res.status(500).json({ error: 'Semantic search failed', detail: error.message });
    }
});

// POST /ask

// const askSchema = z.object({
//     question: z.string().min(1).max(2000),
//     fileIds: z.array(z.string().uuid()).min(1).max(20),
//     topK: z.number().int().min(1).max(20).optional().default(8),
//     model: z.string().optional(),
//     minScore: z.number().min(0).max(1).optional().default(0.25),
//     stream: z.boolean().optional().default(true),
// });

const askSchema = z.object({
    question: z.string().min(1).max(2000),
    fileIds: z.array(z.string().uuid()).max(20).optional(),
    collectionId: z.string().uuid().optional(),
    topK: z.number().int().min(1).max(20).optional().default(8),
    model: z.string().optional(),
    minScore: z.number().min(0).max(1).optional().default(0.25),
    stream: z.boolean().optional().default(true),
}).refine(
    data => data.fileIds || data.collectionId,
    { message: 'Either fileIds or collectionId is required' }
).refine(
    data => !(data.fileIds && data.collectionId),
    { message: 'Provide either fileIds or collectionId, not both' }
);

router.post('/ask', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
    try {
        const orgId = req.orgId!;

        const parsed = askSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
            return;
        }



        async function resolveAskFileIds(
            data: z.infer<typeof askSchema>,
            orgId: string,
        ): Promise<{ fileIds: string[]; error?: string; status?: number }> {
            if (data.collectionId) {
                const ids = await resolveCollectionToFileIds(data.collectionId, orgId);
                if (ids === null) {
                    return { fileIds: [], error: 'Collection not found', status: 404 };
                }
                if (ids.length === 0) {
                    return { fileIds: [], error: 'Collection has no files', status: 422 };
                }
                return { fileIds: ids };
            }

            // fileIds guaranteed by zod refine
            return { fileIds: data.fileIds! };
        }

        const { question, topK, stream } = parsed.data;
        const minScore = parsed.data.minScore;
        const model = parsed.data.model ?? CHAT_MODEL;

        if (!process.env.OLLAMA_URL) {
            res.status(400).json({ error: 'OLLAMA_URL must be configured to use the /ask endpoint' });
            return;
        }


        const { fileIds: resolvedFileIds, error: resolveError, status: resolveStatus } =
            await resolveAskFileIds(parsed.data, orgId);
        if (resolveError) {
            res.status(resolveStatus ?? 400).json({ error: resolveError });
            return;
        }


        // ── 1. Verify ownership + embedding status ────────────────────────────

        const ownedFiles = await db
            .select({ id: files.id, name: files.name, embeddingStatus: files.embeddingStatus })
            .from(files)
            .where(and(
                eq(files.orgId, orgId),
                isNull(files.deletedAt),
                inArray(files.id, resolvedFileIds),   // ← was: fileIds, now resolvedFileIds
            ));

        // const ownedFiles = await db
        //     .select({ id: files.id, name: files.name, embeddingStatus: files.embeddingStatus })
        //     .from(files)
        //     .where(and(eq(files.orgId, orgId), isNull(files.deletedAt), inArray(files.id, fileIds)));

        if (ownedFiles.length === 0) {
            res.status(404).json({ error: 'No matching files found' });
            return;
        }

        const embeddedFileIds = ownedFiles
            .filter(f => f.embeddingStatus === 'completed')
            .map(f => f.id);

        if (embeddedFileIds.length === 0) {
            res.status(422).json({
                error: 'None of the requested files have embeddings yet. Upload files via /v2/files and wait for embeddingStatus to become "completed", or trigger manually via POST /files/:id/embed.',
                fileStatuses: ownedFiles.map(f => ({
                    id: f.id,
                    name: f.name,
                    embeddingStatus: f.embeddingStatus,
                })),
            });
            return;
        }

        // ── 2. Embed question + retrieve chunks via raw pool query ────────────
        const queryVec = await embedQuery(question);
        const vectorLiteral = `[${queryVec.join(',')}]`;

        const retrievalSql = `
            SELECT
                fc.file_id         AS "fileId",
                f.name             AS "fileName",
                fc.chunk_index     AS "chunkIndex",
                fc.content,
                (1 - (fc.embedding <=> $2::vector))::float4 AS score
            FROM file_chunks fc
            JOIN files f ON f.id = fc.file_id
            WHERE
                fc.org_id    = $1
                AND fc.file_id = ANY($3::uuid[])
                AND f.deleted_at IS NULL
                AND (1 - (fc.embedding <=> $2::vector)) >= $4
            ORDER BY fc.embedding <=> $2::vector
            LIMIT $5
        `;

        const retrievalResult = await pool.query(retrievalSql, [
            orgId,
            vectorLiteral,
            embeddedFileIds,
            minScore,
            topK,
        ]);

        const sources = retrievalResult.rows as Array<{
            fileId: string;
            fileName: string;
            chunkIndex: number;
            content: string;
            score: number;
        }>;

        // ── 3. Build prompt ───────────────────────────────────────────────────
        const contextBlock = sources.length > 0
            ? sources
                .map((s, i) =>
                    `[${i + 1}] File: "${s.fileName}" (chunk ${s.chunkIndex}, score ${s.score.toFixed(3)})\n${s.content}`,
                )
                .join('\n\n---\n\n')
            : '(No relevant document context was found for this question.)';

        const systemPrompt = `You are a precise document analyst. Answer the user's question using ONLY the provided document context.

Rules:
- Cite sources using [1], [2], etc. referencing the chunk numbers in the context.
- If the answer cannot be determined from the context, say so clearly — do not hallucinate.
- Be concise but complete. Include numbers, dates, or specific details when they appear in the context.
- If asked to aggregate (e.g. "total across all invoices"), work through the math explicitly.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: `Document context:\n\n${contextBlock}\n\n---\n\nQuestion: ${question}`,
            },
        ];

        // ── 4a. Streaming ─────────────────────────────────────────────────────
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('X-Accel-Buffering', 'no');
            res.flushHeaders();

            const sendEvent = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
            sendEvent({ type: 'sources', sources });

            try {
                const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, messages, stream: true, options: { temperature: 0.2 } }),
                });

                if (!ollamaRes.ok || !ollamaRes.body) {
                    throw new Error(`Ollama chat failed (${ollamaRes.status}): ${await ollamaRes.text()}`);
                }

                const reader = ollamaRes.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const json = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
                            if (json.message?.content) sendEvent({ type: 'chunk', text: json.message.content });
                            if (json.done) sendEvent({ type: 'done' });
                        } catch { /* malformed line */ }
                    }
                }

                // flush remaining buffer
                if (buffer.trim()) {
                    try {
                        const json = JSON.parse(buffer) as { message?: { content?: string } };
                        if (json.message?.content) sendEvent({ type: 'chunk', text: json.message.content });
                    } catch { /* ignore */ }
                }

                sendEvent({ type: 'done' });
            } catch (llmErr: any) {
                console.error('Ollama streaming error:', llmErr);
                sendEvent({ type: 'error', message: llmErr.message ?? 'LLM request failed' });
            } finally {
                res.end();
            }
            return;
        }

        // ── 4b. Non-streaming ─────────────────────────────────────────────────
        const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, stream: false, options: { temperature: 0.2 } }),
        });

        if (!ollamaRes.ok) {
            throw new Error(`Ollama chat failed (${ollamaRes.status}): ${await ollamaRes.text()}`);
        }

        const ollamaData = await ollamaRes.json() as { message?: { content?: string } };
        res.json({ answer: ollamaData.message?.content ?? '', sources });

    } catch (error: any) {
        console.error('Error in /ask:', error);
        res.status(500).json({ error: 'Failed to process question', detail: error.message });
    }
});

// POST /files/:id/embed

router.post('/:id/embed', requireScope('write'), async (req: ApiKeyRequest, res: Response) => {
    try {
        const orgId = req.orgId!;
        const id = req.params.id as string;

        if (!process.env.OLLAMA_URL) {
            res.status(400).json({ error: 'OLLAMA_URL must be configured to use embeddings' });
            return;
        }

        const [file] = await db
            .select({ id: files.id, extractedText: files.extractedText, embeddingStatus: files.embeddingStatus })
            .from(files)
            .where(and(eq(files.id, id), eq(files.orgId, orgId), isNull(files.deletedAt)));

        if (!file) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        if (!file.extractedText) {
            res.status(400).json({
                error: 'No extracted text available. Run text extraction first via POST /files/:id/extract.',
            });
            return;
        }

        const result = await embedFile({
            fileId: file.id,
            orgId,
            extractedText: file.extractedText,
            replace: true,
        });

        res.json({
            fileId: file.id,
            embeddingStatus: result.skipped ? 'skipped' : 'completed',
            chunksCreated: result.chunksCreated,
        });
    } catch (error: any) {
        console.error('Error embedding file:', error);
        res.status(500).json({ error: 'Embedding failed', detail: error.message });
    }
});

export default router;
