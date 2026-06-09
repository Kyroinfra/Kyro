CREATE TABLE "file_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "file_metadata" ADD CONSTRAINT "file_metadata_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_metadata" ADD CONSTRAINT "file_metadata_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_file_metadata_file_id" ON "file_metadata" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_file_metadata_org_key" ON "file_metadata" USING btree ("org_id","key");--> statement-breakpoint
CREATE INDEX "idx_file_metadata_org_key_value" ON "file_metadata" USING btree ("org_id","key","value");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_file_metadata_file_key" ON "file_metadata" USING btree ("file_id","key");