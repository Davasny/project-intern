DROP INDEX "record_project_name_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "record_project_name_unique_idx" ON "record" USING btree ("project_id","name");