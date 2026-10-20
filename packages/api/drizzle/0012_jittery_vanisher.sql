ALTER TABLE "text_extraction_jobs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "text_extraction_jobs" CASCADE;--> statement-breakpoint
DROP INDEX "idx_files_extraction_job_id";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "extraction_job_id";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "embedding_status";