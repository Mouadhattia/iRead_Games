import {
  useCallback,
  useState,
  useRef,
  useEffect,
  type MouseEvent,
} from "react";
import { motion } from "framer-motion";
import LetterTile from "./letter-tile";
import { useStrandsStore } from "@/lib/strands";

type TilePosition = { x: number; y: number };
type Point = { x: number; y: number };
type WordPosition = [string, [number, number][]];

const foundPathColors = [
  "rgb(16 185 129)",
  "rgb(14 165 233)",
  "rgb(234 179 8)",
  "rgb(168 85 247)",
  "rgb(244 114 182)",
];

interface BoardProps {
  letters: string[][];
  onWordComplete: (word: string) => void;
  foundWords: string[];
  themedWords?: string[];
  wordPositions?: WordPosition[];
  disabled?: boolean;
}

export default function Board({
  letters,
  onWordComplete,
  foundWords,
  themedWords = [],
  wordPositions = [],
  disabled = false,
}: BoardProps) {
  const [selectedTiles, setSelectedTiles] = useState<TilePosition[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [currentWord, setCurrentWord] = useState("");
  const [pointerPosition, setPointerPosition] = useState<Point | null>(null);
  const { revealedWord } = useStrandsStore();

  const getTileKey = (x: number, y: number) => `${x},${y}`;

  const setTileRef = useCallback(
    (x: number, y: number, node: HTMLButtonElement | null) => {
      const key = getTileKey(x, y);
      if (node) {
        tileRefs.current.set(key, node);
      } else {
        tileRefs.current.delete(key);
      }
    },
    []
  );

  const getTileCenter = useCallback((position: TilePosition): Point | null => {
    const board = boardRef.current;
    const tile = tileRefs.current.get(getTileKey(position.x, position.y));
    if (!board || !tile) return null;

    const boardRect = board.getBoundingClientRect();
    const tileRect = tile.getBoundingClientRect();

    return {
      x: tileRect.left - boardRect.left + tileRect.width / 2,
      y: tileRect.top - boardRect.top + tileRect.height / 2,
    };
  }, []);

  const updatePointerPosition = useCallback(
    (clientX: number, clientY: number) => {
      const board = boardRef.current;
      if (!board) return;

      const boardRect = board.getBoundingClientRect();
      setPointerPosition({
        x: clientX - boardRect.left,
        y: clientY - boardRect.top,
      });
    },
    []
  );

  const isAdjacent = (pos1: TilePosition, pos2: TilePosition) => {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
  };

  const findWordInGrid = useCallback(
    (word: string) => {
      if (!word) return null;

      const positions: { x: number; y: number }[] = [];
      const visited = new Set<string>();
      const upperWord = word.toUpperCase();

      const dfs = (x: number, y: number, index: number): boolean => {
        if (index === upperWord.length) return true;
        if (x < 0 || x >= letters[0].length || y < 0 || y >= letters.length)
          return false;

        const posKey = `${x},${y}`;
        if (visited.has(posKey)) return false;
        if (letters[y][x].toUpperCase() !== upperWord[index]) return false;

        visited.add(posKey);
        positions.push({ x, y });

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (dfs(x + dx, y + dy, index + 1)) return true;
          }
        }

        positions.pop();
        visited.delete(posKey);
        return false;
      };

      // Try each position as starting point
      for (let y = 0; y < letters.length; y++) {
        for (let x = 0; x < letters[0].length; x++) {
          if (letters[y][x].toUpperCase() === upperWord[0]) {
            visited.clear();
            positions.length = 0;
            if (dfs(x, y, 0)) return positions;
          }
        }
      }

      return null;
    },
    [letters]
  );

  const getPlacedWordPositions = useCallback(
    (word: string): TilePosition[] | null => {
      const placedWord = wordPositions.find(
        ([targetWord]) => targetWord.toUpperCase() === word.toUpperCase()
      );

      if (!placedWord) return null;

      return placedWord[1].map(([row, col]) => ({ x: col, y: row }));
    },
    [wordPositions]
  );

  const getWordPositions = useCallback(
    (word: string) => getPlacedWordPositions(word) ?? findWordInGrid(word),
    [getPlacedWordPositions, findWordInGrid]
  );

  const isFirstLetterOfRevealedWord = useCallback(
    (x: number, y: number) => {
      if (!revealedWord) return false;

      const firstPosition = getWordPositions(revealedWord)?.[0];
      return firstPosition?.x === x && firstPosition.y === y;
    },
    [revealedWord, getWordPositions]
  );

  const isPartOfFoundThemedWord = useCallback(
    (x: number, y: number) => {
      if (!themedWords || themedWords.length === 0) return false;

      for (const word of foundWords) {
        if (themedWords.includes(word)) {
          const positions = getWordPositions(word);
          if (positions?.some((pos) => pos.x === x && pos.y === y)) {
            return true;
          }
        }
      }

      return false;
    },
    [themedWords, foundWords, getWordPositions]
  );

  const canSelectTile = useCallback(
    (x: number, y: number) => {
      if (isPartOfFoundThemedWord(x, y)) return false;
      if (selectedTiles.length === 0) return true;

      const lastTile = selectedTiles[selectedTiles.length - 1];
      return (
        isAdjacent(lastTile, { x, y }) &&
        !selectedTiles.some((tile) => tile.x === x && tile.y === y)
      );
    },
    [selectedTiles, isPartOfFoundThemedWord]
  );

  const handleTileSelect = useCallback(
    (x: number, y: number) => {
      if (disabled || !isSelecting) return;
      if (isPartOfFoundThemedWord(x, y)) return;

      const lastTile = selectedTiles[selectedTiles.length - 1];
      if (lastTile?.x === x && lastTile.y === y) {
        setPointerPosition(getTileCenter(lastTile));
        return;
      }

      const previousTile = selectedTiles[selectedTiles.length - 2];
      if (previousTile?.x === x && previousTile.y === y) {
        setSelectedTiles((prev) => prev.slice(0, -1));
        setCurrentWord((prev) => prev.slice(0, -1));
        setPointerPosition(getTileCenter(previousTile));
        return;
      }

      if (canSelectTile(x, y)) {
        setSelectedTiles((prev) => [...prev, { x, y }]);
        setCurrentWord((prev) => prev + letters[y][x]);
        setPointerPosition(getTileCenter({ x, y }));
      }
    },
    [
      disabled,
      isSelecting,
      selectedTiles,
      canSelectTile,
      letters,
      getTileCenter,
      isPartOfFoundThemedWord,
    ]
  );

  const handleSelectionStart = (x: number, y: number) => {
    if (disabled) return;
    if (isPartOfFoundThemedWord(x, y)) return;

    setIsSelecting(true);
    setSelectedTiles([{ x, y }]);
    setCurrentWord(letters[y][x]);
    setPointerPosition(getTileCenter({ x, y }));
  };

  const handleSelectionEnd = useCallback(() => {
    if (!isSelecting) return;

    if (currentWord.length >= 3) {
      onWordComplete(currentWord);
    }
    setIsSelecting(false);
    setSelectedTiles([]);
    setCurrentWord("");
    setPointerPosition(null);
  }, [isSelecting, currentWord, onWordComplete]);

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!isSelecting) return;
      updatePointerPosition(event.clientX, event.clientY);
    },
    [isSelecting, updatePointerPosition]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || !isSelecting) return;
      e.preventDefault();

      const touch = e.touches[0];
      updatePointerPosition(touch.clientX, touch.clientY);

      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!element) return;

      const tileElement = element.closest("[data-coords]");
      const coords = tileElement?.getAttribute("data-coords");
      if (!coords) return;

      const [x, y] = coords.split(",").map(Number);
      handleTileSelect(x, y);
    },
    [disabled, isSelecting, updatePointerPosition, handleTileSelect]
  );

  useEffect(() => {
    if (!disabled) return;

    setIsSelecting(false);
    setSelectedTiles([]);
    setCurrentWord("");
    setPointerPosition(null);
  }, [disabled]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    board.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      board.removeEventListener("touchmove", handleTouchMove);
    };
  }, [handleTouchMove]);

  const lastSelectedTile = selectedTiles[selectedTiles.length - 1];
  const previewStart = lastSelectedTile ? getTileCenter(lastSelectedTile) : null;
  const foundWordPaths = foundWords
    .filter((word) => themedWords.includes(word))
    .map((word) => ({
      word,
      path: getWordPositions(word) || [],
    }))
    .filter(({ path }) => path.length > 1);
  const showConnectionLayer =
    foundWordPaths.length > 0 ||
    selectedTiles.length > 1 ||
    Boolean(isSelecting && previewStart && pointerPosition);

  return (
    <div
      ref={boardRef}
      className="relative mx-auto w-full select-none touch-none"
      style={{ maxWidth: `${letters.length * 3.5}rem` }}
      onMouseLeave={handleSelectionEnd}
      onMouseMove={handleMouseMove}
      onMouseUp={handleSelectionEnd}
      onTouchEnd={handleSelectionEnd}
    >
      {showConnectionLayer && (
        <svg
          className="absolute inset-0 z-0 pointer-events-none text-primary"
          style={{ width: "100%", height: "100%" }}
        >
          {foundWordPaths.map(({ word, path }, pathIndex) =>
            path.slice(1).map((tile, i) => {
              const start = getTileCenter(path[i]);
              const end = getTileCenter(tile);
              if (!start || !end) return null;

              return (
                <motion.line
                  key={`found-${word}-${i}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={foundPathColors[pathIndex % foundPathColors.length]}
                  strokeWidth="8"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: 1,
                    opacity: 0.7,
                    transition: { duration: 0.18 },
                  }}
                />
              );
            })
          )}
          {selectedTiles.slice(1).map((tile, i) => {
            const start = getTileCenter(selectedTiles[i]);
            const end = getTileCenter(tile);
            if (!start || !end) return null;

            return (
              <motion.line
                key={`${selectedTiles[i].x}-${selectedTiles[i].y}-${tile.x}-${tile.y}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: 0.75,
                  transition: { duration: 0.12 },
                }}
              />
            );
          })}
          {isSelecting && previewStart && pointerPosition && (
            <line
              x1={previewStart.x}
              y1={previewStart.y}
              x2={pointerPosition.x}
              y2={pointerPosition.y}
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="8 8"
              vectorEffect="non-scaling-stroke"
              opacity="0.45"
            />
          )}
        </svg>
      )}

      {revealedWord && (
        <div className="mb-3 flex justify-center">
          <div className="rounded-full border border-yellow-500/50 bg-yellow-100 px-4 py-1.5 text-center text-sm font-bold uppercase tracking-normal text-yellow-950 shadow-sm">
            {revealedWord}
          </div>
        </div>
      )}

      <div
        className="relative z-10 grid gap-2 p-4 w-full"
        style={{
          gridTemplateColumns: `repeat(${letters.length}, minmax(0, 1fr))`,
        }}
      >
        {letters.map((row, y) =>
          row.map((letter, x) => {
            const isSelected = selectedTiles.some(
              (tile) => tile.x === x && tile.y === y
            );
            const isConnectable =
              !disabled && (!isSelecting || canSelectTile(x, y));
            const isFoundPart = isPartOfFoundThemedWord(x, y);
            const isHintedPart = isFirstLetterOfRevealedWord(x, y);

            return (
              <LetterTile
                key={`${x}-${y}`}
                ref={(node) => setTileRef(x, y, node)}
                letter={letter}
                position={{ x, y }}
                isSelected={isSelected}
                isConnectable={isConnectable}
                isFoundPart={isFoundPart}
                isHintedPart={isHintedPart}
                onMouseDown={() => handleSelectionStart(x, y)}
                onMouseEnter={() => handleTileSelect(x, y)}
                onTouchStart={() => handleSelectionStart(x, y)}
                data-coords={`${x},${y}`}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
