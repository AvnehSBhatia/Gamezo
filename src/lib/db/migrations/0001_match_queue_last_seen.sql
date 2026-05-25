ALTER TABLE "match_queue" ADD COLUMN "last_seen_at" timestamp DEFAULT now() NOT NULL;
