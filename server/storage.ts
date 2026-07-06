import {
  StrandsPuzzle,
  GridSize,
  GameProgress,
  DIFFICULTY_LEVELS,
  SpellingBeeHive,
} from "@shared/types";
import wordListJson from "word-list-json";
import { addDays, startOfDay } from "date-fns";
import { GameConfig } from "@shared/config";
import { generateGridWithWords } from "@/lib/strands.ts";
import { buildSpellingBeeHives } from "./spelling-bee";

export const NO_WORDS_AVAILABLE_MESSAGE =
  "No words available today. Please try again later.";

export class NoWordsAvailableError extends Error {
  public readonly code = "NO_WORDS_AVAILABLE";
  public readonly status = 404;

  constructor(message = NO_WORDS_AVAILABLE_MESSAGE) {
    super(message);
    this.name = "NoWordsAvailableError";
  }
}

function normalizeStoryWord(word: string): string {
  return word.toUpperCase().replace(/[^A-Z]/g, "");
}

function normalizeStoryWords(words: string[]): string[] {
  return [
    ...new Set(
      words
        .filter((word): word is string => typeof word === "string")
        .map(normalizeStoryWord)
        .filter((word) => word.length > 0)
    ),
  ];
}

function assertWordsAvailable(words: string[]): string[] {
  if (words.length === 0) {
    throw new NoWordsAvailableError();
  }

  return words;
}

function assertMinimumWordsAvailable(words: string[], minimum: number): string[] {
  if (words.length < minimum) {
    throw new NoWordsAvailableError();
  }

  return words;
}

export interface IStorage {
  getAvailableWordLengths(): Promise<number[]>;
  getActiveWord(length: number): Promise<string>;
  getIreadWord(length: number): Promise<string>;

  validateWord(
    word: string
  ): Promise<{ isValid: boolean; isPredefinedWord: boolean }>;
  getWordDefinition(word: string): Promise<string | null>;
  getDailyChallenge(
    date: Date,
    competition: Boolean
  ): Promise<{
    id: number;
    words: string[];
    packSize: number;
    expiresAt: Date;
  }>;
  getPastChallenges(
    startDate: Date,
    endDate: Date
  ): Promise<
    {
      id: number;
      date: Date;
      completed: boolean;
    }[]
  >;
  getPlayerProgress(userId: string, challengeId: number): Promise<any>;
  savePlayerProgress(
    userId: string,
    challengeId: number,
    progress: any
  ): Promise<void>;
  validateSpellingBeeWord(word: string): Promise<boolean>;
  getDailySpellingBeeChallenge(
    date: Date,
    competition: Boolean
  ): Promise<{
    id: number;
    games: Array<{
      letters: string[];
      centerLetter: string;
      baseWord: string;
    }>;
    expiresAt: Date;
  }>;

  generateStrandsPuzzle(size: number, theme?: string): Promise<StrandsPuzzle>;
  generateSpellingBeeHive(
    length: number
  ): Promise<SpellingBeeHive & { id: string }>;
  validateStrandsWord(word: string): Promise<{
    isValid: boolean;
    isSpangram: boolean;
    score: number;
  }>;
  getStrandsProgress(
    userId: string,
    puzzleId: string
  ): Promise<GameProgress | null>;
  saveStrandsProgress(
    userId: string,
    puzzleId: string,
    progress: GameProgress
  ): Promise<void>;
  getDailyStrandsPuzzle(date: Date): Promise<StrandsPuzzle>;
  getDailyStrandsPuzzles(date: Date): Promise<{
    puzzles: Array<{
      letters: string[][];
      size: number;
      themedWords: string[];
      wordPositions: [string, [number, number][]][];
    }>;
    expiresAt: Date;
  }>;
  getPastStrandsChallenges(
    startDate: Date,
    endDate: Date
  ): Promise<
    {
      id: number;
      date: Date;
      completed: boolean;
    }[]
  >;
}

function getRandomWords(
  map: Map<number, Set<string>>,
  size: number,
  count: number,
  random = Math.random
): string[] {
  const filteredWords: string[] = [];

  map.forEach((wordsSet) => {
    wordsSet.forEach((word) => {
      if (word.length >= 3 && word.length <= size && /^[A-Z]+$/.test(word)) {
        filteredWords.push(word);
      }
    });
  });

  const shuffled = [...new Set(filteredWords)];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

const bookWords = async (id: string): Promise<string[]> => {
  try {
    const response = await fetch(
      `${process.env.IREAD_API}/reader/get_book_games/${id}`
    );

    if (!response.ok) {
      console.error(`Failed to fetch word list for id: ${id}`);
      return []; // Return empty array instead of undefined
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.words)) {
      console.error("Invalid response format from API");
      return []; // Return empty array for invalid data
    }

    return normalizeStoryWords(data.words);
  } catch (error) {
    console.error("Error fetching book words:", error);
    return []; // Return empty array on error
  }
};

export class MemStorage implements IStorage {
  public readonly ready: Promise<void>;
  private wordLists: Map<number, Set<string>>;
  private storyWords: Map<number, Set<string>>;
  private dailyStoryWords: Map<number, string>;
  private dailyWords: Map<number, string>;
  private dictionary: Set<string>;
  private ireadDictionary: Set<string>;
  private definitions: Map<string, string>;
  private predefinedWords: Set<string>;
  private dailyChallenges: Map<string, any>;
  private definitionCache: Map<string, string>;
  private strandsPuzzles: Map<string, StrandsPuzzle>;
  private strandsProgress: Map<string, GameProgress>;
  private dailyChallengeCache: Map<string, any>;
  private dictionaryLoaded: boolean;

  constructor(private readonly id?: string) {
    this.wordLists = new Map();
    this.storyWords = new Map();
    this.dailyWords = new Map();
    this.dailyStoryWords = new Map();
    this.dictionary = new Set();
    this.ireadDictionary = new Set();
    this.definitions = new Map();
    this.predefinedWords = new Set();
    this.dailyChallenges = new Map();
    this.definitionCache = new Map();
    this.dailyChallengeCache = new Map();
    this.strandsPuzzles = new Map();
    this.strandsProgress = new Map();
    this.dictionaryLoaded = false;
    this.loadDictionary();
    this.ready = this.id ? this.initializeData(this.id) : Promise.resolve();
  }

  private loadDictionary() {
    if (this.dictionaryLoaded) return;

    const allWords: string[] = (wordListJson as string[]).map((word) =>
      word.toUpperCase()
    );
    this.dictionary = new Set(allWords);

    for (let length = 3; length <= 7; length++) {
      const wordsOfLength = allWords.filter((word) => word.length === length);
      this.wordLists.set(length, new Set(wordsOfLength));

      if (wordsOfLength.length > 0) {
        this.dailyWords.set(
          length,
          wordsOfLength[Math.floor(Math.random() * wordsOfLength.length)]
        );
      }
    }

    const commonWords = allWords
      .filter((word) => word.length >= 3 && word.length <= 7)
      .slice(0, 1000);

    this.predefinedWords = new Set(commonWords);
    this.dictionaryLoaded = true;
  }

  private async initializeData(id?: string) {
    if (!id) {
      console.warn("No ID provided for initialization");
      return;
    }
    const wordsInStory = await bookWords(id);
    this.ireadDictionary = new Set(wordsInStory);
    this.storyWords.clear();
    this.dailyStoryWords.clear();

    for (let length = 3; length <= 7; length++) {
      const wordsInStoryOfLength = wordsInStory.filter(
        (word) => word.length === length
      );
      this.storyWords.set(length, new Set(wordsInStoryOfLength));

      const wordStoryArray = Array.from(this.storyWords.get(length)!);

      if (wordStoryArray.length > 0) {
        this.dailyStoryWords.set(
          length,
          wordStoryArray[Math.floor(Math.random() * wordStoryArray.length)]
        );
      }
    }
  }

  private async ensureIreadWordsAvailable(): Promise<void> {
    await this.ready;

    if (this.ireadDictionary.size === 0 && this.id) {
      await this.initializeData(this.id);
    }

    if (this.ireadDictionary.size === 0) {
      throw new NoWordsAvailableError();
    }
  }

  private getRandomWordsForDate(date: Date): string[] {
    const dateKey = date.toISOString().split("T")[0];
    const cached = this.dailyChallengeCache.get(dateKey);

    if (cached) {
      return cached.words;
    }

    let seed = Array.from(dateKey).reduce(
      (acc, char) => acc + char.charCodeAt(0),
      0
    );

    const seededRandom = (max: number): number => {
      seed = (seed * 9301 + 49297) % 233280;
      return Math.floor((seed / 233280) * max);
    };

    const getWordFromList = (length: number): string => {
      const words = Array.from(this.storyWords.get(length) || []);
      if (!words.length) {
        throw new NoWordsAvailableError();
      }
      return words[seededRandom(words.length)];
    };

    return GameConfig.dailyChallenge.wordLengths.map((length: number) =>
      getWordFromList(length)
    );
  }

  async getPastChallenges(
    startDate: Date,
    endDate: Date
  ): Promise<
    {
      id: number;
      date: Date;
      completed: boolean;
    }[]
  > {
    const challenges = [];
    let currentDate = startOfDay(startDate);
    const end = startOfDay(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const challenge = {
        id: Date.parse(dateStr),
        date: currentDate,
        completed: false,
      };
      challenges.push(challenge);
      currentDate = addDays(currentDate, 1);
    }

    return challenges;
  }

  async refreshDailyWords() {
    await this.ensureIreadWordsAvailable();
    for (let length = 3; length <= 7; length++) {
      const words = Array.from(this.storyWords.get(length) || []);
      if (words.length > 0) {
        this.dailyStoryWords.set(
          length,
          words[Math.floor(Math.random() * words.length)]
        );
      }
    }
  }
  async getActiveWord(length: number = 5): Promise<string> {
    await this.ready;
    return this.dailyWords.get(length) || this.dailyWords.get(5)!;
  }

  async getIreadWord(length: number = 5): Promise<string> {
    await this.refreshDailyWords();

    const word =
      this.dailyStoryWords.get(length) ||
      this.dailyStoryWords.get(5);

    if (!word) {
      throw new NoWordsAvailableError();
    }

    return word;
  }

  async getAllIreadWord(id?: string): Promise<string[]> {
    if (id) {
      const allWords = await bookWords(id);
      return assertWordsAvailable(allWords);
    }

    await this.ensureIreadWordsAvailable();
    return assertWordsAvailable(Array.from(this.ireadDictionary));
  }

  async validateWord(
    word: string
  ): Promise<{ isValid: boolean; isPredefinedWord: boolean }> {
    await this.ready;
    const upperWord = word.toUpperCase();
    const isValid = this.dictionary.has(upperWord);
    const isPredefinedWord = this.predefinedWords.has(upperWord);
    return { isValid, isPredefinedWord };
  }

  async getWordDefinition(word: string): Promise<string | null> {
    await this.ready;
    const upperWord = word.toUpperCase();

    if (this.definitionCache.has(upperWord)) {
      return this.definitionCache.get(upperWord)!;
    }

    const definition = await this.fetchDefinition(word);
    if (definition) {
      this.definitionCache.set(upperWord, definition);
    }
    return definition;
  }

  private async fetchDefinition(word: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`
      );
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      if (data && data[0] && data[0].meanings && data[0].meanings[0]) {
        const definition = data[0].meanings[0].definitions[0].definition;
        return definition.length > 100
          ? definition.slice(0, 97) + "..."
          : definition;
      }
      return null;
    } catch (error) {
      console.error("Error fetching definition:", error);
      return null;
    }
  }

  async getDailyChallenge(
    date: Date,
    competition: Boolean
  ): Promise<{
    id: number;
    words: string[];
    packSize: number;
    expiresAt: Date;
  }> {
    await this.ensureIreadWordsAvailable();
    const dateKey = date.toISOString().split("T")[0];
    const cacheKey = `daily-challenge-${dateKey}-${
      competition ? "competition" : "daily"
    }`;
    const now = Date.now();
    const cached = this.dailyChallengeCache.get(cacheKey);

    if (cached && now - cached.cachedAt < 300000) {
      return {
        id: cached.id,
        words: cached.words,
        packSize: cached.packSize,
        expiresAt: cached.expiresAt,
      };
    }

    const expiresAt = new Date(date);
    expiresAt.setHours(GameConfig.dailyChallenge.expiryHours, 0, 0, 0);
    const competetionWords = [
      ...Array.from(this.storyWords.get(5) || []).slice(0, 2),
      ...Array.from(this.storyWords.get(6) || []).slice(0, 1),
    ];

    const words = assertWordsAvailable(
      competition ? competetionWords : this.getRandomWordsForDate(date)
    );

    const challenge = {
      id: Date.parse(dateKey),
      words,
      packSize: GameConfig.dailyChallenge.packSize,
      expiresAt,
      cachedAt: now,
    };

    this.dailyChallengeCache.set(cacheKey, challenge);

    return {
      id: challenge.id,
      words: challenge.words,
      packSize: challenge.packSize,
      expiresAt: challenge.expiresAt,
    };
  }

  async getPlayerProgress(userId: string, challengeId: number): Promise<any> {
    return null;
  }

  async savePlayerProgress(
    userId: string,
    challengeId: number,
    progress: any
  ): Promise<void> {}

  async validateSpellingBeeWord(word: string): Promise<boolean> {
    await this.ready;
    const upperWord = word.toUpperCase();
    return this.dictionary.has(upperWord);
  }

  async getDailySpellingBeeChallenge(
    date: Date,
    competition: Boolean
  ): Promise<{
    id: number;
    games: Array<{
      letters: string[];
      centerLetter: string;
      baseWord: string;
    }>;
    expiresAt: Date;
  }> {
    await this.ensureIreadWordsAvailable();
    const dateKey = date.toISOString().split("T")[0];
    const now = Date.now();
    const cacheKey = `spelling-bee-${dateKey}-${
      competition ? "competition" : "daily"
    }`;
    const cached = this.dailyChallengeCache.get(cacheKey);

    if (cached && now - cached.cachedAt < 300000) {
      return {
        id: cached.id,
        games: cached.words.map((game: any) => ({
          letters: game.letters,
          centerLetter: game.centerLetter,
          baseWord: game.baseWord,
        })),
        expiresAt: cached.expiresAt,
      };
    }

    const expiresAt = new Date(date);
    expiresAt.setHours(24, 0, 0, 0);

    let seed = Array.from(dateKey).reduce(
      (acc, char) => acc + char.charCodeAt(0),
      0
    );
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const pickRandom = <T>(arr: T[]): T => {
      return arr[Math.floor(seededRandom() * arr.length)];
    };

    const vowels = ["A", "E", "I", "O", "U"];
    const commonConsonants = ["R", "S", "T", "N", "L"];
    const otherConsonants = [
      "B",
      "C",
      "D",
      "F",
      "G",
      "H",
      "J",
      "K",
      "M",
      "P",
      "Q",
      "V",
      "W",
      "X",
      "Y",
      "Z",
    ];
    const candidateWords = assertWordsAvailable(
      Array.from(this.ireadDictionary).filter((word) => {
        if (word.length < 6) return false;
        const uniqueLetters = new Set(word.split("")).size;
        return uniqueLetters >= 6;
      })
    );
    const playableWords = competition
      ? candidateWords.slice(0, GameConfig.rules.spellingBee.packSize)
      : candidateWords;

    if (playableWords.length < GameConfig.rules.spellingBee.packSize) {
      throw new NoWordsAvailableError();
    }

    const games = [];
    const usedWords = new Set<string>();

    for (let i = 0; i < GameConfig.rules.spellingBee.packSize; i++) {
      let baseWord: string;
      do {
        baseWord = pickRandom(playableWords);
      } while (usedWords.has(baseWord));

      usedWords.add(baseWord);
      const uniqueLetters = Array.from(new Set(baseWord.split("")));

      const centerLetter = pickRandom(uniqueLetters);
      let letters = uniqueLetters.filter((l) => l !== centerLetter);

      while (letters.length < 6) {
        const currentVowels = letters.filter((l) => vowels.includes(l)).length;
        const needsVowel = currentVowels < 2;

        let additionalLetter;
        if (needsVowel) {
          const availableVowels = vowels.filter((v) => !letters.includes(v));
          additionalLetter = pickRandom(availableVowels);
        } else {
          const availableConsonants = [
            ...commonConsonants,
            ...otherConsonants,
          ].filter((c) => !letters.includes(c));
          additionalLetter = pickRandom(availableConsonants);
        }

        if (additionalLetter && !letters.includes(additionalLetter)) {
          letters.push(additionalLetter);
        }
      }

      letters = [...new Set(letters)];

      letters = letters.sort(() => seededRandom() - 0.5);

      games.push({
        letters: letters.filter((l) => l !== centerLetter),
        centerLetter,
        baseWord,
      });
    }

    const challenge = {
      id: Date.parse(dateKey),
      words: games,
      packSize: GameConfig.rules.spellingBee.packSize,
      expiresAt,
      cachedAt: now,
    };

    this.dailyChallengeCache.set(cacheKey, challenge);

    return {
      id: challenge.id,
      games,
      expiresAt: challenge.expiresAt,
    };
  }

  async generateStrandsPuzzle(
    size: number,
    theme?: string
  ): Promise<StrandsPuzzle> {
    await this.ensureIreadWordsAvailable();
    const gridSize = {
      rows: size,
      cols: size,
    };

    const generatedTheme = theme || "Ocean";

    const targetCount = size <= 5 ? 2 : 3;
    const themedWords = assertMinimumWordsAvailable(
      getRandomWords(this.storyWords, size, targetCount).map((w) =>
        w.toUpperCase()
      ),
      targetCount
    );

    const [grid, wordPositions] = generateGridWithWords(
      gridSize,
      themedWords
    );
    const placedWords = wordPositions.map(([word]) => word);
    assertMinimumWordsAvailable(placedWords, themedWords.length);

    const letters = grid.flat();

    const puzzleId = Date.now().toString();

    // Filter valid words that can be made from the grid letters
    const validWords = Array.from(this.dictionary).filter((word) => {
      if (word.length < 3) return false;
      const wordLetters = word.split("");
      const letterCounts = new Map<string, number>();

      // Count letters in the grid
      letters.forEach((letter) => {
        letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
      });

      // Check if we have enough of each letter
      return wordLetters.every((letter) => {
        const count = letterCounts.get(letter) || 0;
        letterCounts.set(letter, count - 1);
        return count > 0;
      });
    });

    const puzzle: StrandsPuzzle = {
      id: puzzleId,
      theme: generatedTheme,
      gridSize,
      letters,
      validWords,
      spangram: placedWords[0] ?? "",
      difficulty: size,
      isDaily: false,
      themedWords: placedWords,
      wordPositions,
    };

    this.strandsPuzzles.set(puzzleId, puzzle);
    return puzzle;
  }

  async generateSpellingBeeHive(
    length: number
  ): Promise<SpellingBeeHive & { id: string }> {
    await this.ensureIreadWordsAvailable();

    const candidateCount = length <= 4 ? 4 : 7;
    const candidates = assertMinimumWordsAvailable(
      getRandomWords(this.storyWords, length, candidateCount),
      1
    );

    const hives = buildSpellingBeeHives(candidates);
    if (hives.length === 0) {
      throw new NoWordsAvailableError();
    }

    const hive = [...hives].sort(
      (a, b) => b.themedWords.length - a.themedWords.length
    )[0];

    return { ...hive, id: Date.now().toString() };
  }

  async validateStrandsWord(word: string): Promise<{
    isValid: boolean;
    isSpangram: boolean;
    score: number;
  }> {
    await this.ready;
    const upperWord = word.toUpperCase();

    const isValid = upperWord.length >= 3 && this.dictionary.has(upperWord);

    let score = 0;
    if (isValid) {
      score = upperWord.length;
    }

    return {
      isValid,
      score,
      isSpangram: false,
    };
  }

  async getStrandsProgress(
    userId: string,
    puzzleId: string
  ): Promise<GameProgress | null> {
    const key = `${userId}-${puzzleId}`;
    return this.strandsProgress.get(key) || null;
  }

  async saveStrandsProgress(
    userId: string,
    puzzleId: string,
    progress: GameProgress
  ): Promise<void> {
    const key = `${userId}-${puzzleId}`;
    this.strandsProgress.set(key, progress);
  }

  async getDailyStrandsPuzzle(date: Date): Promise<StrandsPuzzle> {
    await this.ready;
    const dateKey = date.toISOString().split("T")[0];
    const existingPuzzle = Array.from(this.strandsPuzzles.values()).find(
      (p) => p.isDaily && p.id === dateKey
    );

    if (existingPuzzle) {
      return existingPuzzle;
    }

    const puzzle = await this.generateStrandsPuzzle(DIFFICULTY_LEVELS.MEDIUM);
    puzzle.id = dateKey;
    puzzle.isDaily = true;

    this.strandsPuzzles.set(dateKey, puzzle);
    return puzzle;
  }

  async getDailyStrandsPuzzles(date: Date): Promise<{
    puzzles: Array<{
      letters: string[][];
      size: number;
      themedWords: string[];
      wordPositions: [string, [number, number][]][];
    }>;
    expiresAt: Date;
  }> {
    await this.ensureIreadWordsAvailable();
    const dateKey = date.toISOString().split("T")[0];
    const cacheKey = `daily-strands-${dateKey}`;
    const cached = this.dailyChallengeCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }

    const puzzles = [];
    let seed = Array.from(dateKey).reduce(
      (acc, char) => acc + char.charCodeAt(0),
      0
    );

    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < GameConfig.dailyChallenge.strands.packSize; i++) {
      const size =
        GameConfig.dailyChallenge.strands.gridSizes[
          i as keyof typeof GameConfig.dailyChallenge.strands.gridSizes
        ];
      const targetCount = size <= 5 ? 2 : 3;
      const targetWords = assertMinimumWordsAvailable(
        getRandomWords(this.storyWords, size, targetCount, seededRandom),
        targetCount
      );

      const [grid, wordPositions] = generateGridWithWords(
        { rows: size, cols: size },
        targetWords
      );
      const placedWords = wordPositions.map(([word]) => word);
      assertMinimumWordsAvailable(placedWords, targetWords.length);

      puzzles.push({
        letters: grid,
        size,
        themedWords: placedWords,
        wordPositions,
      });
    }

    const expiresAt = new Date(date);
    expiresAt.setHours(24, 0, 0, 0);

    const result = {
      puzzles,
      expiresAt,
    };

    this.dailyChallengeCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }
  async getPastStrandsChallenges(
    startDate: Date,
    endDate: Date
  ): Promise<
    {
      id: number;
      date: Date;
      completed: boolean;
    }[]
  > {
    const challenges = [];
    let currentDate = startOfDay(startDate);
    const end = startOfDay(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const challenge = {
        id: Date.parse(dateStr),
        date: new Date(currentDate),
        completed: false,
      };
      challenges.push(challenge);
      currentDate = addDays(currentDate, 1);
    }

    return challenges;
  }
  async getAvailableWordLengths(): Promise<number[]> {
    await this.ready;
    // Get unique word lengths from the actual word list
    const lengths = new Set<number>();
    for (const word of wordListJson) {
      if (word.length >= 4 && word.length <= 7) {
        // Only include 4-7 letter words
        lengths.add(word.length);
      }
    }
    return Array.from(lengths).sort((a, b) => a - b);
  }
  private generateGrid(size: GridSize, theme: string): string[] {
    const vowels = ["A", "E", "I", "O", "U"];
    const commonConsonants = ["R", "S", "T", "N", "L"];
    const otherConsonants = [
      "B",
      "C",
      "D",
      "F",
      "G",
      "H",
      "J",
      "K",
      "M",
      "P",
      "Q",
      "V",
      "W",
      "X",
      "Y",
      "Z",
    ];

    const letters: string[] = [];
    const totalCells = size.rows * size.cols;

    const numVowels = Math.floor(totalCells * 0.3);
    const numCommonConsonants = Math.floor(totalCells * 0.4);

    for (let i = 0; i < numVowels; i++) {
      letters.push(vowels[Math.floor(Math.random() * vowels.length)]);
    }

    for (let i = 0; i < numCommonConsonants; i++) {
      letters.push(
        commonConsonants[Math.floor(Math.random() * commonConsonants.length)]
      );
    }

    while (letters.length < totalCells) {
      letters.push(
        otherConsonants[Math.floor(Math.random() * otherConsonants.length)]
      );
    }

    return letters.sort(() => Math.random() - 0.5);
  }
}

export const createStorage = (id?: string) => new MemStorage(id);
