ALTER TABLE "file_chunks" ADD COLUMN "text_search_vector" "tsvector";--> statement-breakpoint
CREATE INDEX "idx_file_chunks_fts" ON "file_chunks" USING gin ("text_search_vector");

-- Trigger: keep text_search_vector in sync whenever content is inserted or updated.
-- Handwritten — Drizzle cannot model triggers.
CREATE OR REPLACE FUNCTION file_chunks_tsvector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.text_search_vector := to_tsvector('english', NEW.content);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS file_chunks_tsvector_trigger ON file_chunks;

CREATE TRIGGER file_chunks_tsvector_trigger
  BEFORE INSERT OR UPDATE OF content
  ON file_chunks
  FOR EACH ROW
  EXECUTE FUNCTION file_chunks_tsvector_update();

-- Backfill any rows that already exist (from before this migration)
UPDATE file_chunks
SET text_search_vector = to_tsvector('english', content)
WHERE text_search_vector IS NULL;
