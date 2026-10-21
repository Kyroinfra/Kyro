-- #34: drop the file-level full-text machinery, drop files.deleted_at
-- (hard delete — cascades clean the children), rebuild the org index plain.
--
-- Hand-edited drizzle-kit output (same reasoning as 0013: kit cannot see the
-- trigger from 0006/0003, and the GIN index idx_files_text_search is implied
-- in the text_search_vector drop). Trigger/function names come from 0003.

-- Trigger BEFORE its column, or UPDATE of extracted_text breaks first.
DROP TRIGGER IF EXISTS files_text_search_trigger ON "files";--> statement-breakpoint
DROP FUNCTION IF EXISTS files_text_search_update();--> statement-breakpoint
-- Partial org index references deleted_at — drop it first so the column drop
-- doesn't cascade it silently underneath us.
DROP INDEX "idx_files_org_id";--> statement-breakpoint
-- Dropping the column also drops idx_files_text_search (GIN, from 0003).
ALTER TABLE "files" DROP COLUMN "text_search_vector";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "deleted_at";--> statement-breakpoint
CREATE INDEX "idx_files_org_id" ON "files" USING btree ("org_id");
