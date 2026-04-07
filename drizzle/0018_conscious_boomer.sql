ALTER TABLE "task" ADD COLUMN "state" text DEFAULT 'accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "proposed_by" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "accepted_by" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "rejected_by" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_proposed_by_user_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_accepted_by_user_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_rejected_by_user_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_project_state_idx" ON "task" USING btree ("project_id","state");