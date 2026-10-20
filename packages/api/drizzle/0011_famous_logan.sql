ALTER TABLE "files" ADD COLUMN "status" varchar(50) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "error" text;--> statement-breakpoint
-- Backfill: fold the dual vocabularies (text_extraction_jobs.status +
-- files.embedding_status) into one files.status (#33). Old columns and the
-- jobs table still exist while this statement runs.
UPDATE "files" SET "status" = CASE
  WHEN "embedding_status" = 'completed' THEN 'ready'
  WHEN "embedding_status" = 'skipped'   THEN 'skipped'
  WHEN "embedding_status" = 'failed'    THEN 'failed'
  ELSE 'pending'
END;--> statement-breakpoint
-- Files whose extraction job failed: carry the job's error message over.
UPDATE "files" f SET "status" = 'failed', "error" = j."error"
  FROM "text_extraction_jobs" j
  WHERE j."file_id" = f."id" AND j."status" = 'failed'
    AND f."embedding_status" IS DISTINCT FROM 'completed';