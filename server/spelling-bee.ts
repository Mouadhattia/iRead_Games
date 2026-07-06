import { SpellingBeeHive } from "@shared/types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface OpenHive {
  words: string[];
  letterSet: Set<string>;
  centerCandidates: Set<string>;
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  const result = new Set<string>();
  a.forEach((letter) => {
    if (b.has(letter)) result.add(letter);
  });
  return result;
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function finalizeHive(hive: OpenHive): SpellingBeeHive {
  const centerLetter = [...hive.centerCandidates].sort()[0];
  const outerLetters = [...hive.letterSet].filter((letter) => letter !== centerLetter);

  for (const letter of ALPHABET) {
    if (outerLetters.length >= 6) break;
    if (letter !== centerLetter && !outerLetters.includes(letter)) {
      outerLetters.push(letter);
    }
  }

  return {
    letters: shuffle(outerLetters.slice(0, 6)),
    centerLetter,
    themedWords: hive.words,
  };
}

/**
 * Groups story words into hives sharing a center letter and at most 7 unique
 * letters, mirroring how Strands chunks story words across grid puzzles.
 * Every word is guaranteed to land in some hive (solo if it shares no letters
 * with others); words needing more than 7 unique letters can't fit any
 * hexagon and are skipped.
 */
export function buildSpellingBeeHives(
  words: string[],
  maxWordsPerHive = 3
): SpellingBeeHive[] {
  const candidates = words
    .map((word) => ({
      word: word.toUpperCase(),
      letterSet: new Set(word.toUpperCase().split("")),
    }))
    .filter(({ word, letterSet }) => {
      if (letterSet.size > 7) {
        console.warn(`Skipping word '${word}': more than 7 unique letters`);
        return false;
      }
      return true;
    })
    .sort((a, b) => b.letterSet.size - a.letterSet.size);

  const openHives: OpenHive[] = [];

  for (const { word, letterSet } of candidates) {
    const hive = openHives.find((candidate) => {
      if (candidate.words.length >= maxWordsPerHive) return false;
      if (intersect(candidate.centerCandidates, letterSet).size === 0) return false;
      const union = new Set([...candidate.letterSet, ...letterSet]);
      return union.size <= 7;
    });

    if (hive) {
      hive.words.push(word);
      hive.centerCandidates = intersect(hive.centerCandidates, letterSet);
      letterSet.forEach((letter) => hive.letterSet.add(letter));
    } else {
      openHives.push({
        words: [word],
        letterSet: new Set(letterSet),
        centerCandidates: new Set(letterSet),
      });
    }
  }

  return openHives.map(finalizeHive);
}
