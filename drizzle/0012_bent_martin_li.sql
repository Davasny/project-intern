CREATE TABLE "opencode_server" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"port" integer NOT NULL,
	"api_key" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "opencode_server" ADD CONSTRAINT "opencode_server_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opencode_server_organization_id_idx" ON "opencode_server" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "opencode_server_status_idx" ON "opencode_server" USING btree ("status");