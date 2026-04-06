CREATE TYPE "public"."article_category" AS ENUM('equipment', 'procedure', 'safety', 'regulatory', 'troubleshooting');--> statement-breakpoint
CREATE TYPE "public"."article_source_type" AS ENUM('session', 'manual', 'feedback');--> statement-breakpoint
CREATE TYPE "public"."confidence_level" AS ENUM('unverified', 'technician_reviewed', 'expert_approved', 'manufacturer_sourced');--> statement-breakpoint
CREATE TYPE "public"."link_type" AS ENUM('reference', 'prerequisite', 'related');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'approved', 'rejected', 'needs_revision');--> statement-breakpoint
CREATE TABLE "knowledge_articles" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"org_id" varchar(36) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"summary" text,
	"content_md" text NOT NULL,
	"category" "article_category" NOT NULL,
	"equipment_brand" varchar(100),
	"equipment_model" varchar(100),
	"procedure_type" varchar(100),
	"confidence_level" "confidence_level" DEFAULT 'unverified' NOT NULL,
	"source_type" "article_source_type" NOT NULL,
	"source_session_ids" jsonb,
	"tags" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"previous_version_id" varchar(30),
	"embedding_id" varchar(100),
	"embedding_model" varchar(100),
	"word_count" integer,
	"retrieval_count" integer DEFAULT 0 NOT NULL,
	"last_retrieved_at" timestamp with time zone,
	"is_ai_generated" boolean DEFAULT true NOT NULL,
	"created_by" varchar(36),
	"verified_by" varchar(36),
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_links" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"source_article_id" varchar(30) NOT NULL,
	"target_article_id" varchar(30) NOT NULL,
	"link_type" "link_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_verifications" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"article_id" varchar(30) NOT NULL,
	"org_id" varchar(36) NOT NULL,
	"reviewer_id" varchar(36) NOT NULL,
	"status" "verification_status" NOT NULL,
	"reviewer_notes" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
