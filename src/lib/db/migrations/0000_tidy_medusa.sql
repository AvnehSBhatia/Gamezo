CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(256),
	"name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "match_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_queue" (
	"user_id" varchar(128) PRIMARY KEY NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"preview_seed" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_rooms" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"player_a" varchar(128) NOT NULL,
	"player_b" varchar(128) NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "match_events_room_idx" ON "match_events" USING btree ("room_id","id");--> statement-breakpoint
CREATE INDEX "match_queue_joined_idx" ON "match_queue" USING btree ("joined_at");