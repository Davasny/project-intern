ALTER TABLE "project_schema_version" ADD COLUMN "state" text DEFAULT 'accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_schema_version" ADD COLUMN "proposed_by" uuid;--> statement-breakpoint
ALTER TABLE "project_schema_version" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_schema_version_one_created_proposal_idx" ON "project_schema_version" USING btree ("project_id") WHERE "project_schema_version"."state" = 'created';
