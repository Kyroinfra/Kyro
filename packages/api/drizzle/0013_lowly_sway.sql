-- #34: replace the handwritten tsvector triggers with a generated column and
-- add an HNSW ANN index on file_chunks.embedding.
--
-- Hand-edited from drizzle-kit output (kit asked for the same diff, but it
-- cannot see triggers, and it assumes a dropped column's indexes survive a
-- re-added column — in Postgres they do not). Trigger and function names come
-- from migrations 0003/0006.

-- Kill the trigger BEFORE dropping its target column, or every subsequent
-- INSERT/UPDATE of content fails on the missing column assignment.
DROP TRIGGER IF EXISTS file_chunks_tsvector_trigger ON "file_chunks";--> statement-breakpoint
DROP FUNCTION IF EXISTS file_chunks_tsvector_update();--> statement-breakpoint
ALTER TABLE "file_chunks" DROP COLUMN "text_search_vector";--> statement-breakpoint
ALTER TABLE "file_chunks" ADD COLUMN "text_search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;--> statement-breakpoint
-- Re-create the GIN index (it was cascade-dropped with the old column;
-- drizzle-kit omits this because the column name is unchanged in its diff).
CREATE INDEX "idx_file_chunks_fts" ON "file_chunks" USING gin ("text_search_vector");--> statement-breakpoint
-- ANN index for the dense arm of hybrid search (`<=>` cosine):
CREATE INDEX "idx_file_chunks_embedding_hnsw" ON "file_chunks" USING hnsw ("embedding" vector_cosine_ops);
