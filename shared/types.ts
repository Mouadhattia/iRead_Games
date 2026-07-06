/**
 * Grid dimensions for game boards
 * @interface GridSize
 */
export interface GridSize {
  /** Number of rows in the grid */
  rows: number;
  /** Number of columns in the grid */
  cols: number;
}

/**
 * Represents a complete Strands puzzle configuration
 * @interface StrandsPuzzle
 */
export interface StrandsPuzzle {
  /** Unique identifier for the puzzle */
  id: string;
  /** Theme or category of the puzzle */
  theme: string;
  /** Grid dimensions */
  gridSize: GridSize;
  /** Array of letters to be placed in the grid */
  letters: string[];
  /** List of valid words that can be formed */
  validWords: string[];
  /** The longest possible word in the puzzle */
  spangram: string;
  /** Difficulty level of the puzzle */
  difficulty: number;
  /** Whether this is a daily challenge puzzle */
  isDaily?: boolean;
  /** Theme words used to build the puzzle */
  themedWords?: string[];
  /** Grid positions for placed theme words */
  wordPositions?: [string, [number, number][]][];
}

/**
 * Represents a single letter hive for the Bee Genius game
 * @interface SpellingBeeHive
 */
export interface SpellingBeeHive {
  /** Outer letters surrounding the center letter, padded to 6 */
  letters: string[];
  /** The required center letter every word must contain */
  centerLetter: string;
  /** Story words this hive's letters can spell */
  themedWords: string[];
}

/**
 * Tracks a player's progress in a specific puzzle
 * @interface GameProgress
 */
export interface GameProgress {
  /** User identifier */
  userId: string;
  /** Associated puzzle identifier */
  puzzleId: string;
  /** List of words found by the player */
  discoveredWords: string[];
  /** Number of hints used */
  hintsUsed: number;
  /** Current score */
  score: number;
  /** Whether the spangram was found */
  spangramFound: boolean;
  /** When the player started the puzzle */
  startedAt: Date;
  /** Last time the player interacted with the puzzle */
  lastPlayedAt: Date;
  /** Whether the puzzle is completed */
  completed: boolean;
}

/**
 * Difficulty level constants for game modes
 */
export const DIFFICULTY_LEVELS = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
} as const;

/**
 * Default grid sizes for each difficulty level
 * Maps difficulty levels to their corresponding grid dimensions
 */
export const DEFAULT_GRID_SIZES: Record<number, GridSize> = {
  [DIFFICULTY_LEVELS.EASY]: { rows: 6, cols: 8 },
  [DIFFICULTY_LEVELS.MEDIUM]: { rows: 7, cols: 7 },
  [DIFFICULTY_LEVELS.HARD]: { rows: 8, cols: 8 },
};
