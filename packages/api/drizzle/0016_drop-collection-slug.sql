ALTER TABLE "collection_files" DROP CONSTRAINT "collection_files_added_by_users_id_fk";
--> statement-breakpoint
DROP INDEX "idx_collections_org_slug";--> statement-breakpoint
ALTER TABLE "collection_files" DROP COLUMN "added_by";--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "slug";