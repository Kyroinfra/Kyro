# TODO

* [x] No collection/folder concept

Legal discovery teams organize by matter, researchers by project, support bots by product area. Right now everything is a flat file list per org. You need a `collections` table that files belong to, and the `/ask` and `/semantic-search` endpoints need a `collectionId` filter alongside `fileIds`. Passing 50 file IDs per query is not a real UX.

* [ ] Embedding is fire-and-forget with no visibility

`embeddingStatus` on the file is good, but there's no way to know "are all files in this collection ready for querying?" You need either a collection-level readiness summary or a bulk status endpoint. Legal teams will ask "can I query this yet?" constantly during document ingestion.

* [ ] The chunking strategy is naïve for legal/research docs

Fixed character chunking at 1200 chars with 200 overlap will split across headings, clauses, and citations. For legal documents especially, you want to respect structural boundaries — at minimum detect double-newlines as paragraph breaks and prefer those. For PDFs you're already getting raw text from `pdf-parse` which loses structure, but that's a harder problem.

* [ ] No reranking

Your retrieval is pure cosine similarity. For "find all clauses mentioning indemnification across 200 contracts" you'll get noisy results. Even a simple cross-encoder rerank pass (or BM25 hybrid) would meaningfully improve precision for legal/research use cases. Ollama can run cross-encoder models locally.

* [ ] `/ask` only supports a fixed `fileIds` array

For a support bot knowledge base, the caller shouldn't have to know which files are relevant — that's the whole point of RAG. You need a mode where it searches across the entire org's embedded corpus (or a collection) rather than requiring explicit file IDs.

* [ ] No document metadata/tagging

Legal: matter number, document type, date range, parties. Research: authors, publication year, journal. Support: product, version, category. Without metadata filtering your semantic search has no way to scope queries beyond file IDs.
