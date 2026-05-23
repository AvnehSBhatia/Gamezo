import type { InferSelectModel } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const anonymousPlayers = pgTable(
  "gamezo_anonymous_players",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    displayName: text("display_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("gamezo_anonymous_players_created_at_idx").on(table.createdAt),
  })
);

export const matches = pgTable(
  "gamezo_matches",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    phase: varchar("phase", { length: 32 }).notNull(),
    playerAId: varchar("player_a_id", { length: 128 }).notNull(),
    playerBId: varchar("player_b_id", { length: 128 }).notNull(),
    state: jsonb("state").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    phaseIdx: index("gamezo_matches_phase_idx").on(table.phase),
    createdAtIdx: index("gamezo_matches_created_at_idx").on(table.createdAt),
  })
);

export const submissions = pgTable(
  "gamezo_submissions",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    matchId: varchar("match_id", { length: 128 }).notNull(),
    playerId: varchar("player_id", { length: 128 }).notNull(),
    slot: varchar("slot", { length: 16 }).notNull(),
    html: text("html").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    matchIdx: index("gamezo_submissions_match_idx").on(table.matchId),
  })
);

export const votes = pgTable(
  "gamezo_votes",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    matchId: varchar("match_id", { length: 128 }).notNull(),
    voterId: varchar("voter_id", { length: 128 }).notNull(),
    votedForSlot: varchar("voted_for_slot", { length: 16 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    matchIdx: index("gamezo_votes_match_idx").on(table.matchId),
  })
);

export const judgingResults = pgTable(
  "gamezo_judging_results",
  {
    matchId: varchar("match_id", { length: 128 }).primaryKey(),
    winnerSlot: varchar("winner_slot", { length: 16 }).notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  }
);

export type GamezoMatch = InferSelectModel<typeof matches>;
