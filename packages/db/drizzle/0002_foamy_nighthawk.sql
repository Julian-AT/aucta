CREATE TYPE "public"."ai_session_status" AS ENUM('connecting', 'active', 'completed', 'failed', 'timeout', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."finding_category" AS ENUM('safety', 'maintenance', 'regulatory', 'observation', 'recommendation');--> statement-breakpoint
CREATE TYPE "public"."finding_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TABLE "ai_sessions" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"org_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"status" "ai_session_status" DEFAULT 'connecting' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_ms" integer,
	"model_version" varchar(100),
	"language_detected" varchar(10),
	"token_count_input" integer,
	"token_count_output" integer,
	"feedback_rating" integer,
	"feedback_note" text,
	"summary" text,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"tools_used" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_findings" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"session_id" varchar(30) NOT NULL,
	"category" "finding_category" NOT NULL,
	"description" text NOT NULL,
	"severity" "finding_severity" NOT NULL,
	"equipment_model" varchar(200),
	"manufacturer" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_tool_calls" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"session_id" varchar(30) NOT NULL,
	"tool_name" varchar(100) NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"duration_ms" integer,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_findings" ADD CONSTRAINT "session_findings_session_id_ai_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_tool_calls" ADD CONSTRAINT "session_tool_calls_session_id_ai_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_sessions"("id") ON DELETE no action ON UPDATE no action;