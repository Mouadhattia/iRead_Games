import { createRequire } from "module";
const require = createRequire(import.meta.url);
const wordList = require("word-list-json");

// Group words by length and only include 5-7 letter words

const wordsByLength = new Map<number, string[]>();
for (const word of wordList) {
  const length = word.length;
  if (length >= 5 && length <= 7) {
    // Only include 5-7 letter words
    if (!wordsByLength.has(length)) {
      wordsByLength.set(length, []);
    }
    wordsByLength.get(length)!.push(word.toUpperCase());
  }
}

// Common English words list for both games
export const commonWords = new Set(wordList);

// Predefined words with various lengths
export const predefinedWords = new Set([
  // 5 letters
  "STEAM",
  "LEARN",
  "WORLD",
  "THINK",
  "BRAIN",
  "SMART",
  "LOGIC",
  "SHAPE",
  "PAINT",
  // 6 letters
  "PUZZLE",
  "CODING",
  "GAMING",
  "WISDOM",
  "NATURE",
  "SEARCH",
  "DESIGN",
  "CREATE",
  // 7 letters
  "EXPLORE",
  "ACHIEVE",
  "DEVELOP",
  "IMAGINE",
  "PROCESS",
  "SCIENCE",
  "PATTERN",
  "DISCOVER",
  // Theme: Science
  "ATOMS",
  "CELLS",
  "EARTH",
  "SPACE",
  "ENERGY",
  "MATTER",
  // Theme: Art
  "COLOR",
  "BRUSH",
  "DRAW",
  "CRAFT",
  "SKETCH",
  "ARTIST",
]);

// Get available word lengths from actual word list
export function getAvailableWordLengths(): number[] {
  return Array.from(wordsByLength.keys()).sort((a, b) => a - b);
}

// Get all words of a specific length
export function getWordsByLength(length: number): string[] {
  return wordsByLength.get(length) || [];
}

// Calculate word score based on length and whether it's predefined
export function calculateWordScore(
  word: string,
  isPredefined: boolean = false
): number {
  const baseScore = word.length;
  const predefinedBonus = isPredefined ? 10 : 0;
  return baseScore + predefinedBonus;
}

export function calculateWordPoints(word: string): number {
  const length = word.length;

  if (length >= 3 && length <= 4) return 5;
  if (length === 5) return 8;
  if (length === 6) return 12;
  if (length === 7) return 16;
  if (length === 8) return 20;
  if (length >= 9) return 25;

  return 0; // Return 0 for words shorter than 3 letters
}
