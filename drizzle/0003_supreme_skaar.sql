CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"record_id" uuid NOT NULL,
	"related_project_id" uuid NOT NULL,
	"related_record_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "record_edge" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"from_project_id" uuid NOT NULL,
	"from_record_id" uuid NOT NULL,
	"to_project_id" uuid NOT NULL,
	"to_record_id" uuid NOT NULL,
	"relation_type" text NOT NULL,
	"direction" text NOT NULL,
	"state" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_record_id_record_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_related_project_id_project_id_fk" FOREIGN KEY ("related_project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_related_record_id_record_id_fk" FOREIGN KEY ("related_record_id") REFERENCES "public"."record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_edge" ADD CONSTRAINT "record_edge_from_project_id_project_id_fk" FOREIGN KEY ("from_project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_edge" ADD CONSTRAINT "record_edge_from_record_id_record_id_fk" FOREIGN KEY ("from_record_id") REFERENCES "public"."record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_edge" ADD CONSTRAINT "record_edge_to_project_id_project_id_fk" FOREIGN KEY ("to_project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_edge" ADD CONSTRAINT "record_edge_to_record_id_record_id_fk" FOREIGN KEY ("to_record_id") REFERENCES "public"."record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_edge" ADD CONSTRAINT "record_edge_created_by_task_id_task_id_fk" FOREIGN KEY ("created_by_task_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_project_record_created_at_idx" ON "activity_log" USING btree ("project_id","record_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_log_related_project_record_created_at_idx" ON "activity_log" USING btree ("related_project_id","related_record_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_log_entity_idx" ON "activity_log" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "record_edge_source_idx" ON "record_edge" USING btree ("from_project_id","from_record_id");--> statement-breakpoint
CREATE INDEX "record_edge_target_idx" ON "record_edge" USING btree ("to_project_id","to_record_id");--> statement-breakpoint
CREATE INDEX "record_edge_project_relation_type_idx" ON "record_edge" USING btree ("from_project_id","to_project_id","relation_type");--> statement-breakpoint
CREATE INDEX "record_edge_from_record_relation_state_idx" ON "record_edge" USING btree ("from_record_id","relation_type","state");--> statement-breakpoint
CREATE INDEX "record_edge_to_record_relation_state_idx" ON "record_edge" USING btree ("to_record_id","relation_type","state");