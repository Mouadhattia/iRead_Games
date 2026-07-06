import { create } from "zustand";
import { getHintUnlockWordCount } from "./hints";

const normalizeSpellingBeeWord = (word: string) => word.trim().toUpperCase();

interface SpellingBeeState {
  letters: string[];
  centerLetter: string;
  themedWords: string[];
  foundWords: Record<string, string[]>;
  nonThemedWords: string[];
  currentHiveId: string;
  hintsAvailable: number;
  hintsUsed: number;
  isGameOver: boolean;
  revealedWord: string | null;
  gameStarted: boolean;

  initializeGame: (
    hiveId: string,
    letters: string[],
    centerLetter: string,
    themedWords: string[]
  ) => void;
  setHive: (
    hiveId: string,
    letters: string[],
    centerLetter: string,
    themedWords: string[]
  ) => void;
  addFoundWord: (
    word: string,
    hintUnlockWordCount?: number | null
  ) => Promise<{
    isValid: boolean;
    isThemed: boolean;
    hintEarned: boolean;
    hintProgress: number;
    hintsAvailable: number;
    alreadyFound: boolean;
  }>;
  useHint: (hintUnlockWordCount?: number | null) => string | null;
  endGame: () => void;
  resetGame: () => void;
}

export const useSpellingBeeStore = create<SpellingBeeState>((set, get) => ({
  letters: [],
  centerLetter: "",
  themedWords: [],
  foundWords: {},
  nonThemedWords: [],
  currentHiveId: "",
  hintsAvailable: 0,
  hintsUsed: 0,
  isGameOver: false,
  revealedWord: null,
  gameStarted: false,

  initializeGame: (hiveId, letters, centerLetter, themedWords) =>
    set({
      letters,
      centerLetter: normalizeSpellingBeeWord(centerLetter),
      themedWords: themedWords.map(normalizeSpellingBeeWord),
      foundWords: {},
      nonThemedWords: [],
      currentHiveId: hiveId,
      hintsAvailable: 0,
      hintsUsed: 0,
      isGameOver: false,
      revealedWord: null,
      gameStarted: true,
    }),

  setHive: (hiveId, letters, centerLetter, themedWords) =>
    set({
      letters,
      centerLetter: normalizeSpellingBeeWord(centerLetter),
      themedWords: themedWords.map(normalizeSpellingBeeWord),
      currentHiveId: hiveId,
      revealedWord: null,
      gameStarted: true,
    }),

  addFoundWord: async (word, hintUnlockWordCount) => {
    const upperWord = normalizeSpellingBeeWord(word);
    const unlockCount = getHintUnlockWordCount(hintUnlockWordCount);
    const emptyResult = {
      isValid: false,
      isThemed: false,
      hintEarned: false,
      hintProgress: get().nonThemedWords.length % unlockCount,
      hintsAvailable: get().hintsAvailable,
      alreadyFound: false,
    };

    if (upperWord.length < 4) {
      return emptyResult;
    }

    try {
      const response = await fetch("/api/spelling-bee/validate", {
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
      const currentWords = state.foundWords[state.currentHiveId] || [];
      const isThemed = state.themedWords.includes(upperWord);
      const hintProgress = state.nonThemedWords.length % unlockCount;

      if (isThemed) {
        if (currentWords.includes(upperWord)) {
          return {
            isValid: true,
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
            [currentState.currentHiveId]: [
              ...(currentState.foundWords[currentState.currentHiveId] || []),
              upperWord,
            ],
          },
          revealedWord:
            currentState.revealedWord === upperWord
              ? null
              : currentState.revealedWord,
        }));

        return {
          isValid: true,
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

  useHint: (hintUnlockWordCount) => {
    const state = get();
    const unlockCount = getHintUnlockWordCount(hintUnlockWordCount);
    const earnedHints = Math.floor(state.nonThemedWords.length / unlockCount);
    const availableHints = Math.max(state.hintsAvailable, earnedHints);

    if (availableHints <= state.hintsUsed) return null;

    const currentWords = state.foundWords[state.currentHiveId] || [];
    if (state.revealedWord && !currentWords.includes(state.revealedWord)) {
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

  endGame: () => set({ isGameOver: true }),
  resetGame: () =>
    set({
      letters: [],
      centerLetter: "",
      themedWords: [],
      foundWords: {},
      nonThemedWords: [],
      currentHiveId: "",
      hintsAvailable: 0,
      hintsUsed: 0,
      isGameOver: false,
      revealedWord: null,
      gameStarted: false,
    }),
}));
