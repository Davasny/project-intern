CREATE TABLE "project_schema_version" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"parent_version_id" uuid,
	"schema_definition" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "record" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"schema_version" integer NOT NULL,
	"state" text NOT NULL,
	"context" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_schema_version" ADD CONSTRAINT "project_schema_version_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record" ADD CONSTRAINT "record_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_schema_version_project_id_idx" ON "project_schema_version" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_schema_version_project_version_unique_idx" ON "project_schema_version" USING btree ("project_id","version");--> statement-breakpoint
CREATE INDEX "record_project_id_idx" ON "record" USING btree ("project_id","id");--> statement-breakpoint
CREATE INDEX "record_project_name_idx" ON "record" USING btree ("project_id","name");