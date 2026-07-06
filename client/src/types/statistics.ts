export interface GameStatistics {
  lifetime: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    streak: number;
    bestStreak: number;
    hintsUsed: number;
    totalPoints: number;
    averageGuesses: number;
    guessDistribution: Record<string, number>;
  };
  achievements: {
    id: string;
    title: string;
    description: string;
    progress: number;
    goal: number;
    earnedAt: string | null;
  }[];
}