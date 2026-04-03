CREATE TABLE "api_key" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text,
	"prefix" text,
	"start" text NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"last_request_at" timestamp,
	"remaining" text,
	"request_count" text DEFAULT '0' NOT NULL,
	"rate_limit_time_window" text,
	"rate_limit_max" text,
	"reference_id" text NOT NULL,
	"config_id" text NOT NULL,
	"enabled" text DEFAULT 'true' NOT NULL,
	"metadata" text,
	"last_refill_at" timestamp,
	"refill_interval" text,
	"refill_amount" text,
	"permissions" text
);
--> statement-breakpoint
CREATE INDEX "api_key_reference_id_idx" ON "api_key" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "api_key_config_id_idx" ON "api_key" USING btree ("config_id");