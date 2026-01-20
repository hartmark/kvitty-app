CREATE TABLE "sie_import_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"fiscal_period_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_format" text NOT NULL,
	"file_url" text,
	"status" "bank_import_batch_status" DEFAULT 'pending' NOT NULL,
	"total_verifications" integer DEFAULT 0,
	"imported_verifications" integer DEFAULT 0,
	"duplicate_verifications" integer DEFAULT 0,
	"error_message" text,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sie_import_batches" ADD CONSTRAINT "sie_import_batches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sie_import_batches" ADD CONSTRAINT "sie_import_batches_fiscal_period_id_fiscal_periods_id_fk" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sie_import_batches" ADD CONSTRAINT "sie_import_batches_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
