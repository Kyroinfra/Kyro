-- #38: metadata moves out of the file_metadata EAV table into a plain jsonb
-- column on files.
--
-- Hand-edited drizzle-kit output (same reasoning as 0013/0014): the kit
-- orders DDL by schema diff (add column, create index, drop table) and
-- cannot express the row move — the UPDATE spliced here must run AFTER the
-- column exists and BEFORE the table is dropped, so data is never lost.
-- Keep the statement order exactly as written.

ALTER TABLE "file_metadata" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint

-- Move the EAV rows into the column: one jsonb object per file, keys/values
-- preserved verbatim. Files without any metadata rows are left untouched and
-- keep their '{}' default.
UPDATE "files" f
SET metadata = sub.doc
FROM (
  SELECT fm.file_id,
         jsonb_object_agg(fm.key, fm.value)::jsonb AS doc
  FROM "file_metadata" fm
  GROUP BY fm.file_id
) sub
WHERE f.id = sub.file_id;--> statement-breakpoint

CREATE INDEX "idx_files_metadata" ON "files" USING gin ("metadata");--> statement-breakpoint
-- The table drop takes its four indexes (file_id, org+key, org+key+value,
-- unique file+key) with it — EAV machinery gone with #38.
DROP TABLE "file_metadata" CASCADE;
