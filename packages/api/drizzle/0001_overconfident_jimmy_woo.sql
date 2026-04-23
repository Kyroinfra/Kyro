CREATE TABLE "text_extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "extracted_text" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "extraction_job_id" uuid;--> statement-breakpoint
ALTER TABLE "text_extraction_jobs" ADD CONSTRAINT "text_extraction_jobs_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_text_jobs_file_id" ON "text_extraction_jobs" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_text_jobs_status" ON "text_extraction_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_files_extraction_job_id" ON "files" USING btree ("extraction_job_id");