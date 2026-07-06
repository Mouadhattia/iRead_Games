import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { GameConfig } from '@shared/config';
import { useGameStore } from '@/lib/game';

// Create a function to get a fresh store for each test
const getTestStore = () => {
  const store = useGameStore.getState();
  useGameStore.setState({
    hintsUsedThisGame: 0,
    gameMetrics: null,
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
    achievements: store.achievements.map(a => ({ ...a, earnedAt: null }))
  });
  return store;
};

describe('Game Configuration Tests', () => {
  describe('Word Length Rules', () => {
    test('minimum word length should be 3', () => {
      expect(GameConfig.rules.wordLengths.min).toBe(3);
    });

    test('maximum word length should be 7', () => {
      expect(GameConfig.rules.wordLengths.max).toBe(7);
    });

    test('default word length should be 5', () => {
      expect(GameConfig.rules.wordLengths.default).toBe(5);
    });
  });

  describe('Game Rules', () => {
    test('max guesses should vary by word length', () => {
      expect(GameConfig.rules.maxGuesses[3]).toBe(8); // 3-letter words
      expect(GameConfig.rules.maxGuesses[4]).toBe(7); // 4-letter words
      expect(GameConfig.rules.maxGuesses[5]).toBe(6); // 5-letter words
      expect(GameConfig.rules.maxGuesses[6]).toBe(5); // 6-letter words
      expect(GameConfig.rules.maxGuesses[7]).toBe(5); // 7-letter words
    });

    test('hint system configuration', () => {
      expect(GameConfig.rules.allowHints).toBe(true);
      expect(GameConfig.rules.showHintAtGuess).toBe(5);
    });
  });

  describe('Scoring System', () => {
    test('scoring parameters should be properly configured', () => {
      expect(GameConfig.scoring.winBonus).toBe(50);
      expect(GameConfig.scoring.quickWinBonus).toBe(10);
      expect(GameConfig.scoring.hintPenalty).toBe(-20);
      expect(GameConfig.scoring.timePenalty).toBe(-10);
      expect(GameConfig.scoring.predefinedWordBonus).toBe(10);
    });
  });

  describe('Achievement System', () => {
    let store: ReturnType<typeof getTestStore>;

    beforeEach(() => {
      store = getTestStore();
    });

    test('winning streak achievements', () => {
      // Simulate bronze streak
      useGameStore.setState({ 
        stats: { 
          ...store.stats, 
          streak: GameConfig.achievements.streaks.bronze 
        }
      });
      store.checkAchievements();
      expect(useGameStore.getState().achievements.find(a => a.type === 'WINNING_STREAK_5')?.earnedAt).toBeTruthy();
    });

    test('daily streak achievement', () => {
      useGameStore.setState({ 
        stats: { 
          ...store.stats, 
          dailyChallengesCompleted: GameConfig.achievements.dailyStreak 
        }
      });
      store.checkAchievements();
      expect(useGameStore.getState().achievements.find(a => a.type === 'DAILY_STREAK_7')?.earnedAt).toBeTruthy();
    });
  });

  describe('Daily Challenge Configuration', () => {
    test('daily challenge parameters', () => {
      expect(GameConfig.dailyChallenge.packSize).toBe(3);
      expect(GameConfig.dailyChallenge.expiryHours).toBe(24);
      expect(GameConfig.dailyChallenge.minWordsForRanking).toBe(3);
      expect(GameConfig.dailyChallenge.bonusMultiplier).toBe(1.5);
    });
  });
});
