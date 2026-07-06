import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if a given date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear()
}

/**
 * Format time in MM:SS format
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Generate share text for game results
 */
export function formatShareText({
  gameName,
  score,
  guesses,
  maxGuesses,
  timeSpent,
  wordLength,
  achievements = [],
  emoji = ''
}: {
  gameName: string
  score?: number
  guesses: number
  maxGuesses: number
  timeSpent: number
  wordLength: number
  achievements?: Array<{ title: string; earnedAt: Date | null }>
  emoji?: string
}): string {
  const recentAchievements = achievements
    .filter(a => a.earnedAt && isToday(new Date(a.earnedAt)))
    .map(a => `🏆 ${a.title}`)
    .join('\n')

  return [
    `🎮 Word Games - ${gameName}`,
    '',
    score !== undefined && `📊 Score: ${score}`,
    `🎯 ${guesses}/${maxGuesses} guesses`,
    `⏱️ Time: ${formatTime(timeSpent)}`,
    `📏 Word Length: ${wordLength}`,
    recentAchievements && `\n${recentAchievements}`,
    emoji && `\n${emoji}`
  ].filter(Boolean).join('\n')
}