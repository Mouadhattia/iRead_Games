import { GameStatistics } from '@/types/statistics';
import statsData from '@/data/statistics.json';
import classicResults from '@/data/classicGameResults.json';
import dailyResults from '@/data/dailyGameResults.json';
import calendarResults from '@/data/calendarGameResults.json';

interface ClassicGameResult {
  id: string;
  date: string;
  word: string;
  guesses: string[];
  won: boolean;
  guessCount: number;
  timeSpent: number;
  score: number;
  hintsUsed: number;
  difficulty: string;
}

interface DailyGameResult {
  id: string;
  date: string;
  words: Array<{
    word: string;
    guesses: string[];
    won: boolean;
    guessCount: number;
    timeSpent: number;
  }>;
  totalScore: number;
  packCompleted: boolean;
  hintsUsed: number;
}

interface CalendarGameResult {
  id: string;
  month: string;
  challenges: Array<{
    day: number;
    completed: boolean;
    score: number;
    words: string[];
    totalGuesses: number;
    hintsUsed: number;
  }>;
  monthlyScore: number;
  challengesCompleted: number;
}

export function saveClassicGameResult(result: ClassicGameResult): void {
  // In a real application, this would make an API call
  // For now, we'll just update the in-memory state
  classicResults.results.push(result);
  updateStatistics(result);
}

export function saveDailyGameResult(result: DailyGameResult): void {
  dailyResults.results.push(result);
  updateDailyStatistics(result);
}

export function saveCalendarGameResult(result: CalendarGameResult): void {
  calendarResults.results.push(result);
  updateCalendarStatistics(result);
}

function updateStatistics(result: ClassicGameResult): void {
  const stats = statsData.lifetime;

  // Update basic stats
  stats.gamesPlayed++;
  if (result.won) {
    stats.wins++;
    stats.streak++;
    stats.bestStreak = Math.max(stats.streak, stats.bestStreak);
  } else {
    stats.losses++;
    stats.streak = 0;
  }

  // Update guess distribution
  if (result.won) {
    const guessCount = String(
      result.guessCount
    ) as keyof typeof stats.guessDistribution;
    stats.guessDistribution[guessCount] =
      (stats.guessDistribution[guessCount] || 0) + 1;
  }

  // Update other stats
  stats.hintsUsed += result.hintsUsed;
  stats.totalPoints += result.score;

  // Calculate new average guesses
  const totalGuesses = Object.entries(stats.guessDistribution)
    .reduce((sum, [guess, count]) => sum + (parseInt(guess) * count), 0);
  const totalGames = Object.values(stats.guessDistribution).reduce((a, b) => a + b, 0);
  stats.averageGuesses = totalGames > 0 ? totalGuesses / totalGames : 0;
}

function updateDailyStatistics(result: DailyGameResult): void {
  if (result.packCompleted) {
    const stats = statsData.lifetime;
    stats.totalPoints += result.totalScore;
    stats.hintsUsed += result.hintsUsed;
  }
}

function updateCalendarStatistics(result: CalendarGameResult): void {
  const stats = statsData.lifetime;
  stats.totalPoints += result.monthlyScore;
  result.challenges.forEach(challenge => {
    stats.hintsUsed += challenge.hintsUsed;
  });
}

export function getClassicGameResults(): ClassicGameResult[] {
  return classicResults.results;
}

export function getDailyGameResults(): DailyGameResult[] {
  return dailyResults.results;
}

export function getCalendarGameResults(): CalendarGameResult[] {
  return calendarResults.results;
}

export function getStatistics(): GameStatistics {
  return statsData;
}
