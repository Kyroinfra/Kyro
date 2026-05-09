CREATE TABLE "file_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"token_count" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "embedding_status" varchar(50) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_file_chunks_org_id" ON "file_chunks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_file_chunks_file_id" ON "file_chunks" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_file_chunks_file_chunk" ON "file_chunks" USING btree ("file_id","chunk_index");
