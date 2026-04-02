ALTER TABLE "pipeline_definition" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pipeline_run" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "pipeline_definition" CASCADE;--> statement-breakpoint
DROP TABLE "pipeline_run" CASCADE;--> statement-breakpoint
DROP INDEX "artifact_lineage_unique_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_lineage_unique_idx" ON "artifact" USING btree ("record_id","file_id","stage","source_hash");--> statement-breakpoint
ALTER TABLE "task" DROP COLUMN "pipeline_version";--> statement-breakpoint
ALTER TABLE "artifact" DROP COLUMN "pipeline_version";