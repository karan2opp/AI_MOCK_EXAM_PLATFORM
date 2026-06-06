CREATE TYPE "public"."role" AS ENUM('user', 'admin', 'support');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"phone" text DEFAULT '',
	"is_verified" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"avatar_public_id" text,
	"verification_token" text,
	"refresh_token" text,
	"reset_password_token" text,
	"reset_password_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
