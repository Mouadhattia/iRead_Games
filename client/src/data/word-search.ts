import { z } from "zod";

/**
 * Schema for Word Search game results
 */
export const wordSearchResultSchema = z.object({
  id: z.string(),
  date: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  wordsFound: z.number(),
  totalWords: z.number(),
  timeRemaining: z.number(),
  score: z.number(),
  isDaily: z.boolean(),
});

/**
 * Schema for Word Search game statistics
 */
export const wordSearchStatsSchema = z.object({
  gamesPlayed: z.number(),
  totalScore: z.number(),
  averageScore: z.number(),
  wordsFound: z.number(),
  bestScore: z.number(),
  bestTime: z.number(),
  dailyStreak: z.number(),
  longestStreak: z.number(),
  difficultyDistribution: z.object({
    easy: z.number(),
    medium: z.number(),
    hard: z.number(),
    expert: z.number(),
  }),
});

export type WordSearchResult = z.infer<typeof wordSearchResultSchema>;
export type WordSearchStats = z.infer<typeof wordSearchStatsSchema>;

/**
 * Initial statistics state
 */
export const initialWordSearchStats: WordSearchStats = {
  gamesPlayed: 0,
  totalScore: 0,
  averageScore: 0,
  wordsFound: 0,
  bestScore: 0,
  bestTime: 0,
  dailyStreak: 0,
  longestStreak: 0,
  difficultyDistribution: {
    easy: 0,
    medium: 0,
    hard: 0,
    expert: 0,
  },
};

/**
 * Updates game statistics based on a new result
 */
export const updateWordSearchStats = (
  currentStats: WordSearchStats,
  newResult: WordSearchResult
): WordSearchStats => {
  const updatedStats = { ...currentStats };
  
  // Update basic stats
  updatedStats.gamesPlayed++;
  updatedStats.totalScore += newResult.score;
  updatedStats.wordsFound += newResult.wordsFound;
  updatedStats.averageScore = Math.round(updatedStats.totalScore / updatedStats.gamesPlayed);
  
  // Update best scores
  if (newResult.score > updatedStats.bestScore) {
    updatedStats.bestScore = newResult.score;
  }
  if (newResult.timeRemaining > updatedStats.bestTime) {
    updatedStats.bestTime = newResult.timeRemaining;
  }

  // Update difficulty distribution
  updatedStats.difficultyDistribution[newResult.difficulty]++;

  // Update streaks for daily challenges
  if (newResult.isDaily) {
    // Reset streak if the last play wasn't yesterday
    const lastPlayDate = new Date(newResult.date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastPlayDate.toDateString() === yesterday.toDateString()) {
      updatedStats.dailyStreak++;
      if (updatedStats.dailyStreak > updatedStats.longestStreak) {
        updatedStats.longestStreak = updatedStats.dailyStreak;
      }
    } else {
      updatedStats.dailyStreak = 1;
    }
  }

  return updatedStats;
};

/**
 * Sample game achievements
 */
export const WORD_SEARCH_ACHIEVEMENTS = [
  {
    id: 'FIRST_WIN',
    title: 'First Victory',
    description: 'Complete your first Word Search puzzle',
    icon: '🎯',
  },
  {
    id: 'SPEED_DEMON',
    title: 'Speed Demon',
    description: 'Complete a puzzle with over 2 minutes remaining',
    icon: '⚡',
  },
  {
    id: 'DAILY_STREAK_7',
    title: 'Weekly Warrior',
    description: 'Complete daily challenges for 7 days in a row',
    icon: '📅',
  },
  {
    id: 'PERFECTIONIST',
    title: 'Perfectionist',
    description: 'Find all words in an expert grid',
    icon: '🎓',
  },
  {
    id: 'HIGH_SCORER',
    title: 'High Scorer',
    description: 'Score over 1000 points in a single game',
    icon: '🏆',
  },
  {
    id: 'GRID_MASTER',
    title: 'Grid Master',
    description: 'Complete puzzles in all difficulty levels',
    icon: '🌟',
  },
] as const;
