import { create } from "zustand";
import { GridSize } from "@shared/types";
import { getHintUnlockWordCount } from "./hints";

export { getHintUnlockWordCount };

// Grid generation function
export function generateStrandGrid(
  L: number,
  C: number,
  words: string[]
): [string[][], [string, [number, number][]][]] {
  // Validate grid size
  if (L < 3 || C < 3) {
    throw new Error(`Grid size too small (${L}x${C}). Minimum is 3x3`);
  }

  // Validate words
  const validWords = words.filter((word) => {
    if (word.length < 3 || word.length > Math.max(L, C)) {
      console.warn(`Skipping invalid word: ${word}`);
      return false;
    }
    return true;
  });

  // Initialize grid and word positions
  const grid: string[][] = Array.from({ length: L }, () => Array(C).fill(""));
  const wordPositions: [string, [number, number][]][] = [];

  // Define possible directions for word placement
  const directions = [
    [1, 0], // Down
    [0, 1], // Right
    [1, 1], // Diagonal down-right
    [1, -1], // Diagonal down-left
  ];

  // Helper to check if word fits at position
  const canPlaceWord = (
    word: string,
    row: number,
    col: number,
    dr: number,
    dc: number
  ): boolean => {
    for (let i = 0; i < word.length; i++) {
      const r = row + i * dr;
      const c = col + i * dc;
      if (
        r >= L ||
        c >= C ||
        c < 0 ||
        (grid[r][c] !== "" && grid[r][c] !== word[i])
      ) {
        return false;
      }
    }
    return true;
  };

  // Place word in grid
  const placeWord = (word: string): boolean => {
    const upperWord = word.toUpperCase();

    if (upperWord.length > Math.max(L, C)) {
      console.warn(`Word '${upperWord}' is too long for grid`);
      return false;
    }

    // Shuffle directions for randomness
    const shuffledDirections = directions.sort(() => Math.random() - 0.5);

    for (const [dr, dc] of shuffledDirections) {
      // Calculate maxRow and maxCol based on direction and word length
      let maxRow = L - 1;
      let maxCol = C - 1;

      if (dr === 1) {
        // Downwards (vertical)
        maxRow = L - upperWord.length;
      } else if (dr === -1) {
        // Upwards (vertical)
        maxRow = upperWord.length - 1;
      }

      if (dc === 1) {
        // Right (horizontal)
        maxCol = C - upperWord.length;
      } else if (dc === -1) {
        // Left (horizontal)
        maxCol = upperWord.length - 1;
      }

      // Adjust maxRow and maxCol for diagonal directions
      if (dr !== 0 && dc !== 0) {
        // Diagonal placement
        maxRow = L - upperWord.length;
        maxCol = C - upperWord.length;
      }

      console.log(`Trying direction: [${dr}, ${dc}]`);
      console.log(`Max Row: ${maxRow}, Max Col: ${maxCol}`);

      if (maxRow < 0 || maxCol < 0) continue;

      const startingPositions: [number, number][] = [];
      for (let row = 0; row <= maxRow; row++) {
        for (let col = 0; col <= maxCol; col++) {
          startingPositions.push([row, col]);
        }
      }

      // Shuffle starting positions for randomness
      startingPositions.sort(() => Math.random() - 0.5);

      for (const [row, col] of startingPositions) {
        if (canPlaceWord(upperWord, row, col, dr, dc)) {
          const path: [number, number][] = [];
          for (let i = 0; i < upperWord.length; i++) {
            const r = row + i * dr;
            const c = col + i * dc;
            grid[r][c] = upperWord[i];
            path.push([r, c]);
          }
          wordPositions.push([upperWord, path]);
          console.log(
            `Placed word '${upperWord}' at starting position [${row}, ${col}] in direction [${dr}, ${dc}]`
          );
          return true;
        }
      }
    }

    console.warn(`Warning: Could not place word '${upperWord}' in the grid.`);
    return false;
  };

  // Sort words by length (longest first)
  const sortedWords = [...validWords].sort((a, b) => b.length - a.length);

  // Place theme words
  for (const word of sortedWords) {
    if (!placeWord(word)) {
      console.warn(`Warning: Could not place word '${word}' in the grid.`);
    }
  }

  // Fill remaining cells with weighted random letters
  const letterFrequency = {
    A: 8.2,
    B: 1.5,
    C: 2.8,
    D: 4.3,
    E: 12.7,
    F: 2.2,
    G: 2.0,
    H: 6.1,
    I: 6.7,
    J: 0.2,
    K: 0.8,
    L: 4.0,
    M: 2.4,
    N: 6.7,
    O: 7.5,
    P: 1.9,
    Q: 0.1,
    R: 6.0,
    S: 6.3,
    T: 9.1,
    U: 2.8,
    V: 1.0,
    W: 2.4,
    X: 0.2,
    Y: 2.0,
    Z: 0.1,
  };

  const letters = Object.keys(letterFrequency) as Array<
    keyof typeof letterFrequency
  >;
  const totalFrequency = Object.values(letterFrequency).reduce(
    (sum, freq) => sum + freq,
    0
  );

  for (let row = 0; row < L; row++) {
    for (let col = 0; col < C; col++) {
      if (grid[row][col] === "") {
        const randomValue = Math.random() * totalFrequency;
        let cumulativeFrequency = 0;
        for (const letter of letters) {
          cumulativeFrequency += letterFrequency[letter];
          if (randomValue <= cumulativeFrequency) {
            grid[row][col] = letter;
            break;
          }
        }
      }
    }
  }

  return [grid, wordPositions];
}

export function generateGridWithWords(
  size: GridSize,
  words: string[]
): [string[][], [string, [number, number][]][]] {
  const L = size.rows;
  const C = size.cols;
  const grid: string[][] = Array.from({ length: L }, () => Array(C).fill(""));
  const wordPositions: [string, [number, number][]][] = [];

  const directions: [number, number][] = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  type NextCell = {
    row: number;
    col: number;
    direction: [number, number];
  };

  const cellKey = (row: number, col: number) => `${row},${col}`;
  const isInBounds = (row: number, col: number) =>
    row >= 0 && row < L && col >= 0 && col < C;

  const shuffle = <T>(items: T[]) => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const isStraightPath = (path: [number, number][]) => {
    if (path.length < 3) return true;

    const firstDelta: [number, number] = [
      path[1][0] - path[0][0],
      path[1][1] - path[0][1],
    ];

    return path
      .slice(2)
      .every(
        ([row, col], index) =>
          row - path[index + 1][0] === firstDelta[0] &&
          col - path[index + 1][1] === firstDelta[1]
      );
  };

  const getStartPositions = () => {
    const positions: [number, number][] = [];
    for (let row = 0; row < L; row++) {
      for (let col = 0; col < C; col++) {
        if (grid[row][col] === "") {
          positions.push([row, col]);
        }
      }
    }

    return shuffle(positions);
  };

  const buildPath = (word: string): [number, number][] | null => {
    const attemptsPerStart = 80;
    const starts = getStartPositions();

    for (const [startRow, startCol] of starts) {
      for (let attempt = 0; attempt < attemptsPerStart; attempt++) {
        const path: [number, number][] = [[startRow, startCol]];
        const used = new Set([cellKey(startRow, startCol)]);
        let previousDirection: [number, number] | null = null;

        while (path.length < word.length) {
          const [row, col] = path[path.length - 1];
          const nextCells: NextCell[] = shuffle(directions)
            .map(([dr, dc]) => ({
              row: row + dr,
              col: col + dc,
              direction: [dr, dc] as [number, number],
            }))
            .filter(
              (next) =>
                isInBounds(next.row, next.col) &&
                grid[next.row][next.col] === "" &&
                !used.has(cellKey(next.row, next.col))
            );

          if (nextCells.length === 0) break;

          const lastDirection = previousDirection;
          const turningCells: NextCell[] = lastDirection
            ? nextCells.filter(
                (next) =>
                  next.direction[0] !== lastDirection[0] ||
                  next.direction[1] !== lastDirection[1]
              )
            : nextCells;
          const preferredCells: NextCell[] =
            turningCells.length > 0 && Math.random() < 0.75
              ? turningCells
              : nextCells;
          const next: NextCell = preferredCells[0];

          path.push([next.row, next.col]);
          used.add(cellKey(next.row, next.col));
          previousDirection = next.direction;
        }

        if (path.length === word.length && !isStraightPath(path)) {
          return path;
        }
      }
    }

    return null;
  };

  const placeWord = (word: string): boolean => {
    const upperWord = word.toUpperCase();
    const path = buildPath(upperWord);

    if (!path) return false;

    path.forEach(([row, col], index) => {
      grid[row][col] = upperWord[index];
    });
    wordPositions.push([upperWord, path]);
    return true;
  };

  [...words]
    .map((word) => word.toUpperCase())
    .sort((a, b) => b.length - a.length)
    .forEach((word) => {
    if (!placeWord(word)) {
      console.warn(`Warning: Could not place word '${word}' in the grid.`);
    }
    });

  // Fill empty spaces with random letters
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let row = 0; row < L; row++) {
    for (let col = 0; col < C; col++) {
      if (grid[row][col] === "") {
        grid[row][col] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  return [grid, wordPositions];
}

type WordPosition = [string, [number, number][]];

const normalizeStrandsWord = (word: string) => word.trim().toUpperCase();

// Zustand store
interface StrandsState {
  letters: string[][];
  wordPositions: WordPosition[];
  foundWords: Record<string, string[]>;
  themedWords: string[];
  nonThemedWords: string[];
  currentPuzzleId: string;
  score: number;
  hintsAvailable: number;
  hintsUsed: number;
  isGameOver: boolean;
  startTime: number | null;
  gameStarted: boolean;
  gridSize: number;
  revealedWord: string | null;

  initializeGame: (
    size: number,
    puzzleId?: string,
    themedWords?: string[],
    letters?: string[][],
    wordPositions?: WordPosition[]
  ) => void;
  setPuzzle: (
    puzzleId: string,
    letters: string[][],
    themedWords: string[],
    wordPositions: WordPosition[],
    size: number
  ) => void;
  addFoundWord: (
    word: string,
    hintUnlockWordCount?: number | null
  ) => Promise<{
    isValid: boolean;
    score: number;
    isThemed: boolean;
    hintEarned: boolean;
    hintProgress: number;
    hintsAvailable: number;
    alreadyFound: boolean;
  }>;
  useHint: (hintUnlockWordCount?: number | null) => string | null;
  endGame: () => void;
  resetGame: () => void;
  setPuzzleId: (puzzleId: string) => void;
}

export const useStrandsStore = create<StrandsState>((set, get) => ({
  letters: [],
  foundWords: {},
  wordPositions: [],
  themedWords: [],
  nonThemedWords: [],
  currentPuzzleId: "",
  score: 0,
  hintsAvailable: 0,
  hintsUsed: 0,
  isGameOver: false,
  startTime: null,
  gameStarted: false,
  gridSize: 5,
  revealedWord: null,

  initializeGame: (
    size: number,
    puzzleId = "default",
    themedWords = [],
    providedLetters,
    providedWordPositions = []
  ) => {
    const normalizedThemedWords = themedWords.map(normalizeStrandsWord);
    const generated =
      providedLetters && providedWordPositions.length > 0
        ? null
        : generateGridWithWords({ rows: size, cols: size }, [
            ...normalizedThemedWords,
          ]);
    const grid = providedLetters ?? generated![0];
    const wordPositions = providedWordPositions.length > 0
      ? providedWordPositions
      : generated![1];
    const placedWords =
      wordPositions.length > 0
        ? wordPositions.map(([word]) => normalizeStrandsWord(word))
        : normalizedThemedWords;

    set({
      letters: grid,
      wordPositions,
      currentPuzzleId: puzzleId,
      themedWords: placedWords,
      foundWords: {},
      nonThemedWords: [],
      score: 0,
      hintsAvailable: 0,
      hintsUsed: 0,
      isGameOver: false,
      startTime: Date.now(),
      gameStarted: true,
      gridSize: size,
      revealedWord: null,
    });
  },

  setPuzzle: (puzzleId, letters, themedWords, wordPositions, size) =>
    set((state) => ({
      letters,
      wordPositions,
      currentPuzzleId: puzzleId,
      themedWords:
        wordPositions.length > 0
          ? wordPositions.map(([word]) => normalizeStrandsWord(word))
          : themedWords.map(normalizeStrandsWord),
      startTime: state.startTime ?? Date.now(),
      gameStarted: true,
      gridSize: size,
      revealedWord: null,
    })),

  addFoundWord: async (word: string, hintUnlockWordCount?: number | null) => {
    const upperWord = normalizeStrandsWord(word);
    const unlockCount = getHintUnlockWordCount(hintUnlockWordCount);
    const emptyResult = {
      isValid: false,
      score: 0,
      isThemed: false,
      hintEarned: false,
      hintProgress: get().nonThemedWords.length % unlockCount,
      hintsAvailable: get().hintsAvailable,
      alreadyFound: false,
    };

    if (upperWord.length < 3) {
      return emptyResult;
    }

    try {
      const response = await fetch("/api/strands/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: upperWord }),
      });

      if (!response.ok) throw new Error("Failed to validate word");
      const { isValid } = await response.json();

      if (!isValid) {
        return emptyResult;
      }

      const state = get();
      const currentWords = state.foundWords[state.currentPuzzleId] || [];
      const isThemed = state.themedWords.includes(upperWord);
      const hintProgress = state.nonThemedWords.length % unlockCount;

      if (isThemed) {
        if (currentWords.includes(upperWord)) {
          return {
            isValid: true,
            score: 0,
            isThemed: true,
            hintEarned: false,
            hintProgress,
            hintsAvailable: state.hintsAvailable,
            alreadyFound: true,
          };
        }

        set((currentState) => ({
          foundWords: {
            ...currentState.foundWords,
            [currentState.currentPuzzleId]: [
              ...(currentState.foundWords[currentState.currentPuzzleId] || []),
              upperWord,
            ],
          },
          score: currentState.score + 10,
          revealedWord:
            currentState.revealedWord === upperWord
              ? null
              : currentState.revealedWord,
        }));

        return {
          isValid: true,
          score: 10,
          isThemed: true,
          hintEarned: false,
          hintProgress,
          hintsAvailable: state.hintsAvailable,
          alreadyFound: false,
        };
      }

      if (state.nonThemedWords.includes(upperWord)) {
        return {
          isValid: true,
          score: 0,
          isThemed: false,
          hintEarned: false,
          hintProgress,
          hintsAvailable: state.hintsAvailable,
          alreadyFound: true,
        };
      }

      const newNonThemedWords = [...state.nonThemedWords, upperWord];
      const newHintsAvailable = Math.floor(
        newNonThemedWords.length / unlockCount
      );
      const hintEarned = newHintsAvailable > state.hintsAvailable;

      set({
        nonThemedWords: newNonThemedWords,
        hintsAvailable: newHintsAvailable,
      });

      return {
        isValid: true,
        score: 0,
        isThemed: false,
        hintEarned,
        hintProgress: newNonThemedWords.length % unlockCount,
        hintsAvailable: newHintsAvailable,
        alreadyFound: false,
      };
    } catch (error) {
      console.error("Error validating word:", error);
      return emptyResult;
    }
  },

  useHint: (hintUnlockWordCount?: number | null) => {
    const state = get();
    const unlockCount = getHintUnlockWordCount(hintUnlockWordCount);
    const earnedHints = Math.floor(state.nonThemedWords.length / unlockCount);
    const availableHints = Math.max(state.hintsAvailable, earnedHints);

    if (availableHints <= state.hintsUsed) return null;

    const currentWords = state.foundWords[state.currentPuzzleId] || [];
    if (
      state.revealedWord &&
      !currentWords.includes(state.revealedWord)
    ) {
      return state.revealedWord;
    }

    const unrevealedWords = state.themedWords.filter(
      (word) => !currentWords.includes(word) && word !== state.revealedWord
    );

    if (unrevealedWords.length === 0) return null;

    const wordToReveal = unrevealedWords[0];
    set({
      hintsAvailable: availableHints,
      hintsUsed: state.hintsUsed + 1,
      revealedWord: wordToReveal,
    });

    return wordToReveal;
  },

  setPuzzleId: (puzzleId: string) => set({ currentPuzzleId: puzzleId }),
  endGame: () => set({ isGameOver: true }),
  resetGame: () =>
    set({
      letters: [],
      wordPositions: [],
      foundWords: {},
      themedWords: [],
      nonThemedWords: [],
      currentPuzzleId: "",
      score: 0,
      hintsAvailable: 0,
      hintsUsed: 0,
      isGameOver: false,
      startTime: null,
      gameStarted: false,
      revealedWord: null,
    }),
}));
