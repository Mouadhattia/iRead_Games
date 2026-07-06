import { create } from "zustand";
import { toast } from "@/hooks/use-toast";
import { GameConfig, getMaxGuesses } from "@shared/config";

/**
 * Achievement types supported by the game
 * @typedef {string} AchievementType
 */
export type AchievementType =
  | "WINNING_STREAK_5"
  | "WINNING_STREAK_10"
  | "WINNING_STREAK_20"
  | "QUICK_WIN"
  | "NO_HINT_WIN"
  | "DAILY_STREAK_7"
  | "WORD_LENGTH_MASTER";

/**
 * Represents a game achievement that can be earned by players
 * @interface Achievement
 */
export interface Achievement {
  /** The type of achievement */
  type: AchievementType;
  /** Display title of the achievement */
  title: string;
  /** Detailed description of how to earn the achievement */
  description: string;
  /** When the achievement was earned, null if not yet earned */
  earnedAt: Date | null;
  /** Current progress towards earning the achievement */
  progress?: number;
  /** Target value needed to earn the achievement */
  goal?: number;
}

/**
 * Main game state interface containing all game-related data and functions
 * @interface GameState
 */
interface GameState {
  /** Current word length for the game */
  wordLength: number;
  /** Current result */

  /** Maximum allowed guesses for current game */
  maxGuesses: number;
  /** Whether a game is currently in progress */
  gameStarted: boolean;

  result: any;
  /** Whether the hint button should be shown */
  showHintButton: boolean;
  /** Whether the hint is currently visible */
  showHint: boolean;
  /** Current game score */
  score: number;
  /** Timestamp when the current game started */
  startTime: number | null;
  /** Metrics for the current/last game session */
  gameMetrics: {
    won: boolean;
    difficulty: number;
    guessesUsed: number;
    hintsUsed: number;
    timeSpent: number;
    finalScore: number;
    maxGuesses: number;
  } | null;
  /** Number of hints used in the current game session */
  hintsUsedThisGame: number;
  /** Detailed player statistics */
  stats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    streak: number;
    bestStreak: number;
    totalGuesses: number;
    hintsUsed: number;
    dailyChallengesCompleted: number;
    guessDistribution: Record<number, number>; // Track number of wins per guess count
  };
  /** Sets the game difficulty based on word length */
  setDifficulty: (length: number) => void;
  /** Starts a new game */
  startGame: () => void;
  /** get old redsult  */
  getResult: (result: any) => void;
  /** Resets the game state */
  resetGame: () => void;
  /** Increments the number of wins */
  incrementWins: () => void;
  /** Increments the number of losses */
  incrementLosses: () => void;
  /** Shows or hides the hint */
  setShowHint: (show: boolean) => void;
  /** Shows or hides the hint button */
  setShowHintButton: (show: boolean) => void;
  /** Increments the number of hints used */
  incrementHintsUsed: () => void;
  /** Adds points to the current score */
  addToScore: (points: number) => void;
  clearScore: () => void;

  /** Ends the current game and calculates the final score */
  endGame: (won: boolean, guesses: string[]) => void;
  /** Calculates the time spent in the current game */
  calculateTimeSpent: () => number;
  /** Indicates if a daily challenge has been completed */
  dailyChallengeCompleted: boolean;
  /** ID of the last completed daily challenge */
  lastCompletedChallengeId: number | null;
  /** Sets the daily challenge completion status */
  setDailyChallengeCompleted: (challengeId: number) => void;
  /** Resets the daily challenge state */
  resetDailyChallenge: () => void;
  /** Array of achievements */
  achievements: Achievement[];
  /** Checks for and unlocks achievements */
  checkAchievements: () => void;
  /** Unlocks a specific achievement */
  unlockAchievement: (type: AchievementType) => void;
  /** Updates game statistics after a game ends */
  updateStats: (won: boolean, guessCount: number) => void;
  /** Calculates the average number of guesses */
  getAverageGuesses: () => number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    type: "WINNING_STREAK_5",
    title: "Getting Warmed Up",
    description: `Win ${GameConfig.achievements.streaks.bronze} games in a row`,
    earnedAt: null,
    progress: 0,
    goal: GameConfig.achievements.streaks.bronze,
  },
  {
    type: "WINNING_STREAK_10",
    title: "On Fire!",
    description: `Win ${GameConfig.achievements.streaks.silver} games in a row`,
    earnedAt: null,
    progress: 0,
    goal: GameConfig.achievements.streaks.silver,
  },
  {
    type: "WINNING_STREAK_20",
    title: "Unstoppable",
    description: `Win ${GameConfig.achievements.streaks.gold} games in a row`,
    earnedAt: null,
    progress: 0,
    goal: GameConfig.achievements.streaks.gold,
  },
  {
    type: "QUICK_WIN",
    title: "Speed Demon",
    description: `Solve a word in ${GameConfig.achievements.quickWin} guesses or less`,
    earnedAt: null,
  },
  {
    type: "NO_HINT_WIN",
    title: "Pure Skill",
    description: "Win a game without using any hints",
    earnedAt: null,
  },
  {
    type: "DAILY_STREAK_7",
    title: "Week Warrior",
    description: `Complete ${GameConfig.achievements.dailyStreak} daily challenges in a row`,
    earnedAt: null,
    progress: 0,
    goal: GameConfig.achievements.dailyStreak,
  },
  {
    type: "WORD_LENGTH_MASTER",
    title: "Word Length Master",
    description: `Win at least one game with each word length (${GameConfig.rules.wordLengths.min}-${GameConfig.rules.wordLengths.max})`,
    earnedAt: null,
    progress: 0,
    goal:
      GameConfig.rules.wordLengths.max - GameConfig.rules.wordLengths.min + 1,
  },
];

/**
 * Get the appropriate background color class for a letter state
 * @param {("correct" | "present" | "absent" | null)} state - The state of the letter
 * @returns {string} Tailwind CSS class for the background color
 */
export const getColorForState = (
  state: "correct" | "present" | "absent" | null
) => {
  if (!state) return "bg-secondary";

  if (state === "correct") return "bg-[hsl(var(--tile-correct))]";
  if (state === "present") return "bg-[hsl(var(--tile-present))]";
  return "bg-[hsl(var(--tile-absent))]";
};

/**
 * Zustand store for managing game state
 * Creates and manages the global game state including:
 * - Game configuration and settings
 * - Player progress and statistics
 * - Achievement tracking
 * - Daily challenge state
 */
export const useGameStore = create<GameState>((set, get) => ({
  wordLength: 5,
  maxGuesses: 6,
  gameStarted: false,
  result: {},
  showHintButton: false,
  showHint: false,
  score: 0,
  startTime: null,
  gameMetrics: null,
  hintsUsedThisGame: 0,
  stats: {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    streak: 0,
    bestStreak: 0,
    totalGuesses: 0,
    hintsUsed: 0,
    dailyChallengesCompleted: 0,
    guessDistribution: {},
  },
  achievements: ACHIEVEMENTS,
  dailyChallengeCompleted: false, // Add this
  lastCompletedChallengeId: null, // Add this
  setDifficulty: (length: number) =>
    set(() => ({
      wordLength: length,
      maxGuesses: getMaxGuesses(length),
      gameStarted: true,
      startTime: Date.now(),
      gameMetrics: null,
      hintsUsedThisGame: 0,
    })),
  startGame: () =>
    set(() => ({
      gameStarted: true,
      startTime: Date.now(),
      gameMetrics: null,
      hintsUsedThisGame: 0,
    })),

  getResult: (result) =>
    set(() => ({
      result: result,
    })),

  resetGame: () =>
    set(() => ({
      gameStarted: false,
      showHint: false,
      score: 0,
      startTime: null,
      gameMetrics: null,
      hintsUsedThisGame: 0,
      showHintButton: false,
    })),
  incrementWins: () =>
    set((state) => {
      const newStreak = state.stats.streak + 1;
      const comboMultiplier =
        newStreak > 1 ? GameConfig.scoring.comboMultiplier : 1;

      return {
        score: state.score * comboMultiplier,
        stats: {
          ...state.stats,
          wins: state.stats.wins + 1,
          streak: newStreak,
          dailyChallengesCompleted: state.stats.dailyChallengesCompleted + 1,
        },
      };
    }),
  incrementLosses: () =>
    set((state) => ({
      stats: {
        ...state.stats,
        losses: state.stats.losses + 1,
        streak: 0,
      },
    })),
  setShowHint: (show: boolean) =>
    set((state) => {
      if (show && !state.showHint) {
        return {
          showHint: show,
          score: state.score + GameConfig.scoring.hintPenalty,
          hintsUsedThisGame: state.hintsUsedThisGame + 1,
          stats: {
            ...state.stats,
            hintsUsed: state.stats.hintsUsed + 1,
          },
        };
      }
      return { showHint: show };
    }),
  setShowHintButton: (show: boolean) =>
    set(() => ({
      showHintButton: show,
    })),
  incrementHintsUsed: () =>
    set((state) => ({
      stats: {
        ...state.stats,
        hintsUsed: state.stats.hintsUsed + 1,
      },
      hintsUsedThisGame: state.hintsUsedThisGame + 1,
    })),
  addToScore: (points: number) =>
    set((state) => ({
      score: state.score + points,
    })),

  clearScore: () =>
    set((state) => ({
      score: 0,
    })),
  calculateTimeSpent: () => {
    const state = get();
    if (!state.startTime) return 0;
    return Math.floor((Date.now() - state.startTime) / 1000);
  },
  endGame: (win: boolean, guesses: string[]) => {
    const state = get();
    state.updateStats(win, guesses.length);
    const timeSpent = state.calculateTimeSpent();

    let timeScorePenalty = 0;
    if (timeSpent > GameConfig.scoring.timePenaltyThreshold) {
      const minutesOver = Math.floor(
        (timeSpent - GameConfig.scoring.timePenaltyThreshold) / 60
      );
      timeScorePenalty = minutesOver * GameConfig.scoring.timePenalty;
    }

    let winBonus = 0;
    if (win) {
      winBonus =
        GameConfig.scoring.winBonus +
        (state.maxGuesses - guesses.length) * GameConfig.scoring.quickWinBonus;
    }

    const finalScore = state.score + timeScorePenalty + winBonus;

    set({
      score: finalScore,
      gameMetrics: {
        won: win,
        difficulty: state.wordLength,
        guessesUsed: guesses.length,
        hintsUsed: state.hintsUsedThisGame,
        timeSpent,
        finalScore,
        maxGuesses: state.maxGuesses,
      },
    });

    state.checkAchievements();
  },
  setDailyChallengeCompleted: (challengeId: number) =>
    set(() => ({
      dailyChallengeCompleted: true,
      lastCompletedChallengeId: challengeId,
    })),
  resetDailyChallenge: () =>
    set(() => ({
      dailyChallengeCompleted: false,
      lastCompletedChallengeId: null,
    })),
  unlockAchievement: (type: AchievementType) =>
    set((state) => {
      const achievements = state.achievements.map((achievement) => {
        if (achievement.type === type && !achievement.earnedAt) {
          return {
            ...achievement,
            earnedAt: new Date(),
          };
        }
        return achievement;
      });

      const unlockedAchievement = achievements.find((a) => a.type === type);
      if (unlockedAchievement && unlockedAchievement.earnedAt) {
        toast({
          title: "🏆 Achievement Unlocked!",
          description: `${unlockedAchievement.title} - ${unlockedAchievement.description}`,
          duration: GameConfig.ui.toastDuration,
        });
      }

      return { achievements };
    }),
  checkAchievements: () => {
    const state = get();
    const { streaks, quickWin, dailyStreak } = GameConfig.achievements;

    if (state.stats.streak >= streaks.bronze) {
      state.unlockAchievement("WINNING_STREAK_5");
    }
    if (state.stats.streak >= streaks.silver) {
      state.unlockAchievement("WINNING_STREAK_10");
    }
    if (state.stats.streak >= streaks.gold) {
      state.unlockAchievement("WINNING_STREAK_20");
    }

    if (
      state.gameMetrics?.won &&
      state.gameMetrics.guessesUsed <= quickWin
    ) {
      state.unlockAchievement("QUICK_WIN");
    }

    if (state.gameMetrics?.won && state.gameMetrics.hintsUsed === 0) {
      state.unlockAchievement("NO_HINT_WIN");
    }

    if (state.stats.dailyChallengesCompleted >= dailyStreak) {
      state.unlockAchievement("DAILY_STREAK_7");
    }
  },
  updateStats: (won: boolean, guessCount: number) =>
    set((state) => {
      const newStats = {
        ...state.stats,
        gamesPlayed: state.stats.gamesPlayed + 1,
        totalGuesses: state.stats.totalGuesses + guessCount,
      };

      if (won) {
        newStats.wins = state.stats.wins + 1;
        newStats.streak = state.stats.streak + 1;
        newStats.bestStreak = Math.max(state.stats.bestStreak, newStats.streak);
        newStats.guessDistribution = {
          ...state.stats.guessDistribution,
          [guessCount]: (state.stats.guessDistribution[guessCount] || 0) + 1,
        };
      } else {
        newStats.losses = state.stats.losses + 1;
        newStats.streak = 0;
      }

      return { stats: newStats };
    }),
  getAverageGuesses: () => {
    const state = get();
    if (state.stats.wins === 0) return 0;
    return state.stats.totalGuesses / state.stats.wins;
  },
}));

/**
 * Check a guess against the target word and return the state of each letter
 * @param {string} guess - The player's guessed word
 * @param {string} target - The target word to guess
 * @returns {Array<"correct" | "present" | "absent">} Array indicating the state of each letter
 * @example
 * checkGuess("HEART", "EARTH") // Returns ["present", "present", "present", "present", "present"]
 * checkGuess("GUESS", "SOLAR") // Returns ["absent", "absent", "present", "absent", "absent"]
 */
export function checkGuess(
  guess: string,
  target: string
): ("correct" | "present" | "absent")[] {
  const result: ("correct" | "present" | "absent")[] = new Array(
    guess.length
  ).fill("absent");

  const targetWord = target.toUpperCase();
  const guessWord = guess.toUpperCase();

  const letterFreq = new Map<string, number>();
  for (let i = 0; i < targetWord.length; i++) {
    const letter = targetWord[i];
    letterFreq.set(letter, (letterFreq.get(letter) || 0) + 1);
  }

  for (let i = 0; i < guessWord.length; i++) {
    if (guessWord[i] === targetWord[i]) {
      result[i] = "correct";
      const letter = guessWord[i];
      letterFreq.set(letter, letterFreq.get(letter)! - 1);
    }
  }

  for (let i = 0; i < guessWord.length; i++) {
    if (result[i] !== "correct") {
      const letter = guessWord[i];
      if (letterFreq.has(letter) && letterFreq.get(letter)! > 0) {
        result[i] = "present";
        letterFreq.set(letter, letterFreq.get(letter)! - 1);
      }
    }
  }

  return result;
}
