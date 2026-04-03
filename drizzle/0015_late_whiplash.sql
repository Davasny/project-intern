ALTER TABLE "source_file" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "source_file" CASCADE;--> statement-breakpoint
ALTER TABLE "artifact" DROP CONSTRAINT "artifact_file_id_source_file_id_fk";
--> statement-breakpoint
DROP INDEX "artifact_lineage_unique_idx";--> statement-breakpoint
ALTER TABLE "artifact" ADD COLUMN "file_path" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_lineage_unique_idx" ON "artifact" USING btree ("record_id","file_path","stage","source_hash");--> statement-breakpoint
ALTER TABLE "artifact" DROP COLUMN "file_id";