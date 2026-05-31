CREATE TABLE "collection_files" (
	"collection_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"added_by" uuid NOT NULL,
	"added_at" timestamp DEFAULT now(),
	CONSTRAINT "collection_files_collection_id_file_id_pk" PRIMARY KEY("collection_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "file_chunks" ALTER COLUMN "embedding" SET DATA TYPE vector(768);--> statement-breakpoint
ALTER TABLE "collection_files" ADD CONSTRAINT "collection_files_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_files" ADD CONSTRAINT "collection_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_files" ADD CONSTRAINT "collection_files_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_collection_files_file_id" ON "collection_files" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_collection_files_collection_id" ON "collection_files" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "idx_collections_org_id" ON "collections" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_collections_org_slug" ON "collections" USING btree ("org_id","slug");