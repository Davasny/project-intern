CREATE TABLE "task_definition_version" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"task_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"description_markdown" text NOT NULL,
	"model" text,
	"temperature" numeric(2, 1),
	"schema_version" integer NOT NULL,
	"source_schema_version_id" uuid,
	"target_schema_version_id" uuid,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "intern_run" ADD COLUMN "task_definition_version_id" uuid;--> statement-breakpoint
ALTER TABLE "task_definition_version" ADD CONSTRAINT "task_definition_version_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_definition_version" ADD CONSTRAINT "task_definition_version_source_schema_version_id_project_schema_version_id_fk" FOREIGN KEY ("source_schema_version_id") REFERENCES "public"."project_schema_version"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_definition_version" ADD CONSTRAINT "task_definition_version_target_schema_version_id_project_schema_version_id_fk" FOREIGN KEY ("target_schema_version_id") REFERENCES "public"."project_schema_version"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_definition_version" ADD CONSTRAINT "task_definition_version_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_definition_version_task_version_unique_idx" ON "task_definition_version" USING btree ("task_id","version_number");--> statement-breakpoint
CREATE INDEX "task_definition_version_task_created_at_idx" ON "task_definition_version" USING btree ("task_id","created_at");--> statement-breakpoint
INSERT INTO "task_definition_version" (
	"task_id",
	"version_number",
	"title",
	"description_markdown",
	"model",
	"temperature",
	"schema_version",
	"source_schema_version_id",
	"target_schema_version_id",
	"created_by_user_id",
	"created_at"
)
SELECT
	"task"."id",
	"task_description_revision"."revision_number",
	"task"."title",
	"task_description_revision"."description_markdown",
	"task"."model",
	"task"."temperature",
	"task"."schema_version",
	"task"."source_schema_version_id",
	"task"."target_schema_version_id",
	"task_description_revision"."created_by_user_id",
	"task_description_revision"."created_at"
FROM "task_description_revision"
INNER JOIN "task" ON "task"."id" = "task_description_revision"."task_id"
WHERE "task"."state" = 'accepted';--> statement-breakpoint
INSERT INTO "task_definition_version" (
	"task_id",
	"version_number",
	"title",
	"description_markdown",
	"model",
	"temperature",
	"schema_version",
	"source_schema_version_id",
	"target_schema_version_id",
	"created_by_user_id",
	"created_at"
)
SELECT
	"task"."id",
	1,
	"task"."title",
	"task"."description_markdown",
	"task"."model",
	"task"."temperature",
	"task"."schema_version",
	"task"."source_schema_version_id",
	"task"."target_schema_version_id",
	"task"."accepted_by",
	"task"."created_at"
FROM "task"
WHERE "task"."state" = 'accepted'
AND NOT EXISTS (
	SELECT 1
	FROM "task_definition_version"
	WHERE "task_definition_version"."task_id" = "task"."id"
);--> statement-breakpoint
UPDATE "intern_run"
SET "task_definition_version_id" = "version_match"."id"
FROM (
	SELECT
		"intern_run"."id" AS "intern_run_id",
		COALESCE(
			(
				SELECT "task_definition_version"."id"
				FROM "task_definition_version"
				WHERE "task_definition_version"."task_id" = "work_record"."task_id"
				AND "task_definition_version"."created_at" <= "intern_run"."created_at"
				ORDER BY "task_definition_version"."version_number" DESC
				LIMIT 1
			),
			(
				SELECT "task_definition_version"."id"
				FROM "task_definition_version"
				WHERE "task_definition_version"."task_id" = "work_record"."task_id"
				ORDER BY "task_definition_version"."version_number" DESC
				LIMIT 1
			)
		) AS "id"
	FROM "intern_run"
	INNER JOIN "work_record" ON "work_record"."id" = "intern_run"."work_record_id"
) AS "version_match"
WHERE "intern_run"."id" = "version_match"."intern_run_id"
AND "version_match"."id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "intern_run" ADD CONSTRAINT "intern_run_task_definition_version_id_task_definition_version_id_fk" FOREIGN KEY ("task_definition_version_id") REFERENCES "public"."task_definition_version"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intern_run_task_definition_version_idx" ON "intern_run" USING btree ("task_definition_version_id");
