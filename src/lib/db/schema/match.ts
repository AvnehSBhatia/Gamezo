import { index, integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const matchQueue = pgTable(
  "match_queue",
  {
    userId: varchar("user_id", { length: 128 }).primaryKey(),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    previewSeed: text("preview_seed").notNull(),
  },
  (t) => ({ joinedIdx: index("match_queue_joined_idx").on(t.joinedAt) }),
);

export const matchRooms = pgTable("match_rooms", {
  id: varchar("id", { length: 64 }).primaryKey(),
  playerA: varchar("player_a", { length: 128 }).notNull(),
  playerB: varchar("player_b", { length: 128 }).notNull(),
  state: jsonb("state").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const matchEvents = pgTable(
  "match_events",
  {
    id: serial("id").primaryKey(),
    roomId: varchar("room_id", { length: 64 }).notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ roomIdx: index("match_events_room_idx").on(t.roomId, t.id) }),
);
