import { z } from "zod";

export const GameConfig = {
  // Scoring System
  scoring: {
    winBonus: 50,          // Base points for winning
    quickWinBonus: 10,     // Extra points per remaining guess
    hintPenalty: -20,      // Points deducted for using a hint
    timePenalty: -10,      // Points deducted per minute over threshold
    timePenaltyThreshold: 180, // Time threshold in seconds (3 minutes)
    predefinedWordBonus: 10,   // Bonus for using predefined words
    comboMultiplier: 1.5,      // Score multiplier for consecutive wins
  },

  // Game Rules with added Spelling Bee and Word Search settings
  rules: {
    wordLengths: {
      min: 3,
      max: 7,
      default: 5
    },
    maxGuesses: {
      3: 8,
      4: 7,
      5: 6,
      6: 5,
      7: 5
    },
    defaultMaxGuesses: 6,
    allowHints: true,
    showHintAtGuess: 5,
    hintMaxLength: 100,

    // Updated Spelling Bee specific settings
    spellingBee: {
      pointsPerWord: {            // Points awarded based on word length
        4: 1,                     // 4-letter words = 1 point
        5: 5,                     // 5-letter words = 5 points
        6: 6,                     // 6-letter words = 6 points
        7: 7,                     // 7+ letter words = 7 points
      },
      packSize: 3,               // Number of games in daily challenge
      bonusMultiplier: 1.5,      // Score multiplier for completing all games
      difficulty: {
        easy: {
          totalLetters: 6,        // Total letters in the puzzle (including center)
          minWordLength: 3,       // Minimum word length for Easy mode
        },
        medium: {
          totalLetters: 7,
          minWordLength: 4,
        },
        hard: {
          totalLetters: 8,
          minWordLength: 5,
        }
      },
      defaultDifficulty: 'medium' as const,
      pangramBonus: 10,          // Extra points for using all letters
      dailyRefreshTime: 0,       // Hour of the day (0-23) when daily puzzle refreshes
      sessionTimeLimit: 600,     // Time limit in seconds (0 for unlimited)
    },
    wordSearch: {
      gridSizes: {
        easy: 5,       // 5x5 grid
        medium: 6,     // 6x6 grid
        hard: 7,       // 7x7 grid
        expert: 8      // 8x8 grid
      },
      directions: [
        'horizontal',
        'vertical',
        'diagonal'
      ],
      difficulty: {
        easy: {
          maxWordLength: 6,
          minWords: 5,
          maxWords: 8,
          allowReverse: false,
          allowDiagonal: false,
          timeLimit: 420,  // 7 minutes
          hintsAllowed: 3
        },
        medium: {
          maxWordLength: 8,
          minWords: 8,
          maxWords: 12,
          allowReverse: true,
          allowDiagonal: false,
          timeLimit: 360,  // 6 minutes
          hintsAllowed: 2
        },
        hard: {
          maxWordLength: 10,
          minWords: 12,
          maxWords: 15,
          allowReverse: true,
          allowDiagonal: true,
          timeLimit: 300,  // 5 minutes
          hintsAllowed: 1
        },
        expert: {
          maxWordLength: 12,
          minWords: 15,
          maxWords: 20,
          allowReverse: true,
          allowDiagonal: true,
          timeLimit: 240,  // 4 minutes
          hintsAllowed: 0
        }
      },
      scoring: {
        basePoints: 10,        // Base points per word found
        lengthBonus: 2,        // Additional points per letter in word
        timeBonus: 5,         // Points per 30 seconds remaining
        difficultyMultiplier: {
          easy: 1,
          medium: 1.5,
          hard: 2,
          expert: 2.5
        },
        hintPenalty: 0.3,     // 30% reduction in points when using a hint
        streakBonus: 1.2      // 20% bonus for consecutive words found
      },
      hints: {
        types: ['direction', 'firstLetter', 'wordLength'],
        cooldown: 30,         // Seconds between hints
        maxPerGame: {
          easy: 3,
          medium: 2,
          hard: 1,
          expert: 0
        }
      },
      animation: {
        highlightDuration: 1000,  // Duration of word highlight animation
        fadeOutDuration: 500,     // Duration of fade out animation
        popupDuration: 2000       // Duration of score popup
      },
      daily: {
        puzzleCount: 3,           // Number of daily puzzles
        difficulty: 'hard',       // Default difficulty for daily puzzles
        bonusMultiplier: 1.5,     // Score multiplier for daily challenges
        streakBonus: 10,          // Extra points for maintaining daily streak
        expiryHours: 24,          // Hours until puzzle expires
        refreshTime: 0            // Hour of the day when puzzles refresh (0-23)
      }
    }
  },

  // Daily Challenge Settings
  dailyChallenge: {
    packSize: 3,           // Number of words per daily challenge
    expiryHours: 24,       // Hours until challenge expires
    minWordsForRanking: 3, // Minimum words completed to appear on leaderboard
    wordLengths: [5, 5, 6], // Word lengths for daily challenge pack
    bonusMultiplier: 1.5,   // Score multiplier for completing all words
    calendarHistory: 30,    // Number of days to show in challenge calendar

    // Add Strands specific settings
    strands: {
      packSize: 3,         // Number of puzzles in daily challenge
      gridSizes: {
        0: 5,             // First puzzle: 5x5 grid
        1: 6,             // Second puzzle: 6x6 grid
        2: 7              // Third puzzle: 7x7 grid
      },
      wordsPerPuzzle: {
        5: 6,             // 5x5 grid: 6 words
        6: 8,             // 6x6 grid: 8 words
        7: 10             // 7x7 grid: 10 words
      },
      timeLimit: 300,      // Time limit in seconds (5 minutes)
      bonusPoints: {
        completion: 50,    // Points for finding all words
        speed: 20,        // Points for completing under time limit
        streak: 10        // Points for maintaining daily streak
      }
    },

    // Keep existing Word Search settings
    wordSearch: {
      packSize: 3,
      gridSizes: {
        easy: 5,
        medium: 6,
        hard: 7,
        expert: 8
      },
      wordsPerPuzzle: {
        easy: 5,
        medium: 8,
        hard: 12
      },
      timeLimit: 300,
      bonusPoints: {
        completion: 50,
        speed: 20,
        streak: 10
      }
    }
  },

  // Achievement Thresholds
  achievements: {
    streaks: {
      bronze: 5,   // Winning streak for bronze
      silver: 10,  // Winning streak for silver
      gold: 20     // Winning streak for gold
    },
    quickWin: 3,   // Max guesses for quick win achievement
    dailyStreak: 7, // Days needed for daily streak achievement
    wordLengthMastery: true, // Enable achievement for mastering all word lengths
  },

  // Practice Mode Settings
  practice: {
    unlimited: true,      // Allow unlimited practice games
    allowCustomLength: true, // Allow custom word length selection
    trackStats: true,     // Practice attempts now feed the word-progress/achievement engine too (see lib/word-attempts.ts)
  },

  // UI Settings
  ui: {
    toastDuration: 5000,   // Duration of toast notifications in ms
    animationSpeed: 100,   // Base animation speed in ms
    shareResultsDelay: 1000, // Delay before showing share dialog
    colorBlindMode: {
      correct: "bg-blue-600",
      present: "bg-orange-500",
      absent: "bg-zinc-600"
    },
    spellingBee: {
      centerLetterColor: "bg-yellow-500",
      centerLetterHoverColor: "bg-yellow-600",
      outerLetterColor: "bg-white",
      outerLetterHoverColor: "bg-gray-100",
      outerLetterBorderColor: "border-gray-200"
    }
  }
} as const;

// Helper function to get max guesses for a word length
export function getMaxGuesses(wordLength: number): number {
  return GameConfig.rules.maxGuesses[wordLength as keyof typeof GameConfig.rules.maxGuesses]
    ?? GameConfig.rules.defaultMaxGuesses;
}

// Helper to validate word length
export function isValidWordLength(length: number): boolean {
  return length >= GameConfig.rules.wordLengths.min
    && length <= GameConfig.rules.wordLengths.max;
}

// Get daily challenge configuration for a specific date
export function getDailyChallengeConfig(date: Date) {
  return {
    packSize: GameConfig.dailyChallenge.packSize,
    wordLengths: GameConfig.dailyChallenge.wordLengths,
    expiryHours: GameConfig.dailyChallenge.expiryHours
  };
}

// New helper function for Spelling Bee
export function getSpellingBeeDifficultyConfig(difficulty: 'easy' | 'medium' | 'hard') {
  return GameConfig.rules.spellingBee.difficulty[difficulty];
}

// New helper function for Word Search
export function getWordSearchConfig(difficulty: 'easy' | 'medium' | 'hard' | 'expert') {
  return GameConfig.rules.wordSearch.difficulty[difficulty];
}

// Type validation schema for runtime configuration validation
export const configSchema = z.object({
  wordLength: z.number().min(GameConfig.rules.wordLengths.min).max(GameConfig.rules.wordLengths.max),
  maxGuesses: z.number().min(1),
  allowHints: z.boolean(),
  packSize: z.number().min(1).max(5),
  // Add Word Search validation
  gridSize: z.number().min(5).max(8),
  wordCount: z.number().min(5).max(20)
});

export type GameConfigValidation = z.infer<typeof configSchema>;