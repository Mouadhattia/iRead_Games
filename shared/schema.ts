import { pgTable, text, serial, boolean, timestamp, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const words = pgTable("words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  isPredefined: boolean("is_predefined").notNull().default(false),
  definition: text("definition"),
  difficulty: integer("difficulty"),
});

export const dailyChallenges = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  wordIds: integer("word_ids").array().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  packSize: integer("pack_size").notNull().default(3),
  expiresAt: timestamp("expires_at").notNull(),
});

export const strandsPuzzles = pgTable("strands_puzzles", {
  id: serial("id").primaryKey(),
  theme: text("theme").notNull(),
  gridSize: json("grid_size").$type<{ rows: number; cols: number }>().notNull(),
  letters: text("letters").array().notNull(),
  validWords: integer("valid_words").array().notNull(), // References word IDs
  spangram: text("spangram").notNull(),
  difficulty: integer("difficulty").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isDaily: boolean("is_daily").notNull().default(false),
});

export const strandsProgress = pgTable("strands_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  puzzleId: integer("puzzle_id").notNull(),
  discoveredWords: integer("discovered_words").array().notNull(),
  hintsUsed: integer("hints_used").notNull().default(0),
  score: integer("score").notNull().default(0),
  spangramFound: boolean("spangram_found").notNull().default(false),
  startedAt: timestamp("started_at").notNull(),
  lastPlayedAt: timestamp("last_played_at").notNull(),
  completed: boolean("completed").notNull().default(false),
});

export const playerProgress = pgTable("player_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  challengeId: integer("challenge_id").notNull(),
  completedWords: json("completed_words").$type<{
    wordId: number;
    guesses: string[];
    hintsUsed: number;
    timeSpent: number;
    score: number;
    completed: boolean;
  }[]>().notNull(),
  totalScore: integer("total_score").notNull().default(0),
  startTime: timestamp("start_time").notNull(),
  lastPlayedAt: timestamp("last_played_at").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  earnedAt: timestamp("earned_at").notNull(),
  metadata: json("metadata"),
});

// Insert schemas
export const insertWordSchema = createInsertSchema(words);
export const insertChallengeSchema = createInsertSchema(dailyChallenges);
export const insertProgressSchema = createInsertSchema(playerProgress);
export const insertAchievementSchema = createInsertSchema(achievements);
export const insertStrandsPuzzleSchema = createInsertSchema(strandsPuzzles);
export const insertStrandsProgressSchema = createInsertSchema(strandsProgress);

// Types
export type Word = typeof words.$inferSelect;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type PlayerProgress = typeof playerProgress.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type StrandsPuzzle = typeof strandsPuzzles.$inferSelect;
export type StrandsProgress = typeof strandsProgress.$inferSelect;