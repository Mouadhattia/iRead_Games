import { useState, useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Array of colors for highlighting different words
const HIGHLIGHT_COLORS = [
  "word-highlight-1",
  "word-highlight-2",
  "word-highlight-3",
  "word-highlight-4",
  "word-highlight-5",
  "word-highlight-6",
  "word-highlight-7",
  "word-highlight-8",
];

const HIGHLIGHT_THICKNESS = 24;

interface WordInfo {
  word: string;
  direction: string; // "→" | "↓" | "↘" | "↗"
}

interface WordSearchGridProps {
  grid: string[][];
  words: WordInfo[];
  onWordFound: (word: string, hintLevel: number) => void;
  difficulty: "easy" | "medium" | "hard" | "expert";
  disabled?: boolean;
  scoring?: {
    baseScore: number;
    hintPenalty: number;
  };
}

interface Position {
  row: number;
  col: number;
}

interface WordPosition {
  word: string;
  startPos: Position;
  endPos: Position;
  color: string;
  direction: "horizontal" | "vertical" | "diagonal";
  displayDirection: string;
}

export default function WordSearchGrid({
  grid,
  words,
  onWordFound,
  difficulty,
  disabled = false,
  scoring = { baseScore: 10, hintPenalty: 0.3 },
}: WordSearchGridProps) {
  const [selection, setSelection] = useState<Position[]>([]);
  const [foundWords, setFoundWords] = useState<WordPosition[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedHintWord, setSelectedHintWord] = useState<string | null>(null);
  const [clickedWord, setClickedWord] = useState<{
    word: string;
    clicks: number;
    colorIndex?: number;
  } | null>(null);
  const [firstLetterPosition, setFirstLetterPosition] =
    useState<Position | null>(null);
  const [hintsUsed, setHintsUsed] = useState<Map<string, number>>(new Map()); // 0: no hint, 1: direction, 2: position
  const [hintDeductions, setHintDeductions] = useState<Map<string, number>>(
    new Map()
  ); // Track point deductions per word
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridCellsRef = useRef<HTMLDivElement>(null);
  const [gridMetrics, setGridMetrics] = useState({ cellSize: 0, gap: 4 });

  const handleCellMouseDown = (row: number, col: number) => {
    if (disabled) return;
    setSelection([{ row, col }]);
    setIsDragging(true);
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (disabled) return;
    if (isDragging) {
      const lastPos = selection[selection.length - 1];
      if (isValidLine(lastPos, { row, col })) {
        setSelection([...selection, { row, col }]);
      }
    }
  };

  const handleCellMouseUp = () => {
    if (disabled) {
      setSelection([]);
      setIsDragging(false);
      return;
    }

    setIsDragging(false);
    const selectedWord = getSelectedWord();
    if (
      selectedWord &&
      words.some((w) => w.word === selectedWord) &&
      !isWordFound(selectedWord)
    ) {
      const colorIndex = foundWords.length % HIGHLIGHT_COLORS.length;
      const direction = getWordDirection(
        selection[0],
        selection[selection.length - 1]
      );
      const displayDirection = getDisplayDirection(
        direction,
        selection[0],
        selection[selection.length - 1]
      );
      setFoundWords([
        ...foundWords,
        {
          word: selectedWord,
          startPos: selection[0],
          endPos: selection[selection.length - 1],
          color: HIGHLIGHT_COLORS[colorIndex],
          direction,
          displayDirection,
        },
      ]);
      onWordFound(selectedWord, hintsUsed.get(selectedWord) || 0);
    }
    setSelection([]);
  };

  const handleTouchStart = (row: number, col: number) => {
    if (disabled) return;
    setSelection([{ row, col }]);
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || !isDragging) return;

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    // Find the cell coordinates from the element's data attributes
    const cellCoords = element.getAttribute("data-cell-coords");
    if (!cellCoords) return;

    const [row, col] = cellCoords.split(",").map(Number);
    const lastPos = selection[selection.length - 1];

    if (isValidLine(lastPos, { row, col })) {
      setSelection([...selection, { row, col }]);
    }
  };

  const handleTouchEnd = () => {
    if (disabled) {
      setSelection([]);
      setIsDragging(false);
      return;
    }

    setIsDragging(false);
    const selectedWord = getSelectedWord();
    if (
      selectedWord &&
      words.some((w) => w.word === selectedWord) &&
      !isWordFound(selectedWord)
    ) {
      const colorIndex = foundWords.length % HIGHLIGHT_COLORS.length;
      const direction = getWordDirection(
        selection[0],
        selection[selection.length - 1]
      );
      const displayDirection = getDisplayDirection(
        direction,
        selection[0],
        selection[selection.length - 1]
      );
      setFoundWords([
        ...foundWords,
        {
          word: selectedWord,
          startPos: selection[0],
          endPos: selection[selection.length - 1],
          color: HIGHLIGHT_COLORS[colorIndex],
          direction,
          displayDirection,
        },
      ]);
      onWordFound(selectedWord, hintsUsed.get(selectedWord) || 0);
    }
    setSelection([]);
  };

  const isValidLine = (pos1: Position, pos2: Position): boolean => {
    if (selection.length <= 1) {
      // For the first two cells, allow any adjacent selection
      const rowDiff = Math.abs(pos2.row - pos1.row);
      const colDiff = Math.abs(pos2.col - pos1.col);
      return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
    }

    // For subsequent selections, ensure we maintain the same direction
    const initialDirection = {
      row: Math.sign(selection[1].row - selection[0].row),
      col: Math.sign(selection[1].col - selection[0].col),
    };

    const currentDirection = {
      row: Math.sign(pos2.row - pos1.row),
      col: Math.sign(pos2.col - pos1.col),
    };

    return (
      currentDirection.row === initialDirection.row &&
      currentDirection.col === initialDirection.col
    );
  };

  const getSelectedWord = () => {
    return selection.map(({ row, col }) => grid[row][col]).join("");
  };

  const isWordFound = (word: string) => {
    return foundWords.some((found) => found.word === word);
  };

  const findFirstLetterPosition = (word: string): Position | null => {
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[0].length; col++) {
        if (grid[row][col] === word[0]) {
          // Check if this is actually the start of the word
          for (const direction of ["→", "↓", "↘", "↗"]) {
            if (checkWordFromPosition(word, row, col, direction)) {
              return { row, col };
            }
          }
        }
      }
    }
    return null;
  };

  const checkWordFromPosition = (
    word: string,
    row: number,
    col: number,
    direction: string
  ): boolean => {
    const dx =
      direction === "→" || direction === "↘" || direction === "↗" ? 1 : 0;
    const dy =
      direction === "↓" || direction === "↘" ? 1 : direction === "↗" ? -1 : 0;

    if (
      row + (word.length - 1) * dy >= grid.length ||
      row + (word.length - 1) * dy < 0 ||
      col + (word.length - 1) * dx >= grid[0].length
    ) {
      return false;
    }

    for (let i = 0; i < word.length; i++) {
      if (grid[row + i * dy][col + i * dx] !== word[i]) {
        return false;
      }
    }
    return true;
  };

  const getDisplayDirection = (
    direction: "horizontal" | "vertical" | "diagonal",
    start: Position,
    end: Position
  ): string => {
    if (direction === "horizontal") return "→";
    if (direction === "vertical") return "↓";
    if (end.row > start.row && end.col > start.col) return "↘";
    return "↗";
  };

  // const calculateBasePoints = (word: string): number => {
  //   const basePoints = scoring?.baseScore || 10;
  //   const lengthBonus = word.length;
  //   return basePoints + lengthBonus;
  // };

  function calculateBasePoints(word: string): number {
    const length = word.length;

    if (length >= 3 && length <= 4) return 5;
    if (length === 5) return 8;
    if (length === 6) return 12;
    if (length === 7) return 16;
    if (length === 8) return 20;
    if (length >= 9) return 25;

    return 0; // Return 0 for words shorter than 3 letters
  }

  const handleWordClick = (word: string) => {
    if (disabled) return;
    if (hintsUsed.get(word) === 2) return; // Word already has maximum hints

    const currentHints = hintsUsed.get(word) || 0;
    const newHintLevel = currentHints + 1;
    const basePoints = calculateBasePoints(word);
    const deductionPerHint = Math.round(basePoints * scoring.hintPenalty); // 30% of base points per hint

    setHintsUsed((prev) => {
      const newHints = new Map(prev);
      newHints.set(word, newHintLevel);
      return newHints;
    });

    setHintDeductions((prev) => {
      const newDeductions = new Map(prev);
      newDeductions.set(
        word,
        (newDeductions.get(word) || 0) + deductionPerHint
      );
      return newDeductions;
    });

    if (newHintLevel === 1) {
      // First click - show direction
      setSelectedHintWord(word);
      setFirstLetterPosition(null);
      setClickedWord({ word, clicks: 1 });
    } else if (newHintLevel === 2) {
      // Second click - show position
      const position = findFirstLetterPosition(word);
      const colorIndex = foundWords.length % HIGHLIGHT_COLORS.length;
      setFirstLetterPosition(position);
      setClickedWord({ word, clicks: 2, colorIndex });
    }
  };
  const calculateLineStyle = (
    startPos: Position,
    endPos: Position,
    zIndex: number,
    backgroundColor?: string
  ): CSSProperties | undefined => {
    const { cellSize, gap } = gridMetrics;
    if (cellSize <= 0) return undefined;

    const rowDiff = endPos.row - startPos.row;
    const colDiff = endPos.col - startPos.col;
    const distance = Math.hypot(rowDiff, colDiff);
    if (distance === 0) return undefined;

    const unitX = colDiff / distance;
    const unitY = rowDiff / distance;
    const extension = cellSize / 2;
    const startCenterX = startPos.col * (cellSize + gap) + extension;
    const startCenterY = startPos.row * (cellSize + gap) + extension;
    const left = startCenterX - unitX * extension;
    const topCenter = startCenterY - unitY * extension;
    const width = distance * (cellSize + gap) + cellSize;
    const angle = Math.atan2(rowDiff, colDiff) * (180 / Math.PI);

    return {
      position: "absolute",
      pointerEvents: "none",
      borderRadius: "12px",
      transition: "all 0.2s ease",
      width: `${width}px`,
      height: `${HIGHLIGHT_THICKNESS}px`,
      top: `${topCenter - HIGHLIGHT_THICKNESS / 2}px`,
      left: `${left}px`,
      transformOrigin: "0 50%",
      transform: `rotate(${angle}deg)`,
      zIndex,
      ...(backgroundColor ? { backgroundColor } : {}),
    };
  };

  const calculateHighlightStyle = (
    startPos: Position,
    endPos: Position
  ) => {
    return calculateLineStyle(startPos, endPos, 10);
  };

  // Calculate first letter highlight style
  const calculateFirstLetterStyle = (
    position: Position
  ): CSSProperties | undefined => {
    if (!position || clickedWord?.colorIndex === undefined) return undefined;

    const gap = 4; // gap-1 = 4px
    const highlightThickness = HIGHLIGHT_THICKNESS;
    const halfThickness = highlightThickness / 2;
    const cellSizeInPx = `calc((100% - ${(grid[0].length - 1) * gap}px) / ${
      grid[0].length
    })`;

    // Find the word's direction
    const word = clickedWord.word;
    const wordInfo = words.find((w) => w.word === word);
    if (!wordInfo) return undefined;

    const direction = wordInfo.direction;
    const isVertical = direction === "↓";
    const isDiagonal = direction === "↘" || direction === "↗";
    const isUpDiagonal = direction === "↗";

    // Shared base style for highlights
    const baseStyle = {
      position: "absolute" as const,
      pointerEvents: "none" as const,
      borderRadius: "12px",
      zIndex: 9,
    };

    // Center offsets
    const centerOffsetX = `calc(${cellSizeInPx} / 2)`;
    const centerOffsetY = `calc(${cellSizeInPx} / 2)`;

    if (isDiagonal) {
      return {
        ...baseStyle,
        width: cellSizeInPx,
        height: `${highlightThickness}px`,
        top: `calc(${position.row} * (${cellSizeInPx} + ${gap}px) + ${centerOffsetY} - ${halfThickness}px)`,
        left: `calc(${position.col} * (${cellSizeInPx} + ${gap}px) + ${centerOffsetX})`,
        transformOrigin: "0 50%",
        transform: `rotate(${isUpDiagonal ? -45 : 45}deg)`,
      };
    }

    return {
      ...baseStyle,
      width: isVertical ? `${highlightThickness}px` : cellSizeInPx,
      height: !isVertical ? `${highlightThickness}px` : cellSizeInPx,
      top: isVertical
        ? `calc(${position.row} * (${cellSizeInPx} + ${gap}px))`
        : `calc(${position.row} * (${cellSizeInPx} + ${gap}px) + ${centerOffsetY} - ${halfThickness}px)`,
      left: isVertical
        ? `calc(${position.col} * (${cellSizeInPx} + ${gap}px) + ${centerOffsetX} - ${halfThickness}px)`
        : `calc(${position.col} * (${cellSizeInPx} + ${gap}px))`,
      transform: "none",
      transformOrigin: "0 0",
    };
  };

  const getWordDirection = (
    startPos: Position,
    endPos: Position
  ): "horizontal" | "vertical" | "diagonal" => {
    const rowDiff = endPos.row - startPos.row;
    const colDiff = endPos.col - startPos.col;

    if (rowDiff === 0) return "horizontal";
    if (colDiff === 0) return "vertical";
    return "diagonal";
  };

  const getSelectionStyle = (): CSSProperties | undefined => {
    if (selection.length < 2) return undefined;

    const startPos = selection[0];
    const endPos = selection[selection.length - 1];
    return calculateLineStyle(
      startPos,
      endPos,
      15,
      "hsl(var(--primary) / 0.2)"
    );
  };

  useEffect(() => {
    const gridElement = gridCellsRef.current;
    if (!gridElement) return;

    const updateMetrics = () => {
      const styles = window.getComputedStyle(gridElement);
      const gap = parseFloat(styles.columnGap || styles.gap || "4") || 4;
      const columns = grid[0]?.length || 1;
      const cellSize = (gridElement.clientWidth - gap * (columns - 1)) / columns;

      setGridMetrics((current) =>
        Math.abs(current.cellSize - cellSize) < 0.5 &&
        Math.abs(current.gap - gap) < 0.5
          ? current
          : { cellSize, gap }
      );
    };

    updateMetrics();

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(gridElement);
    return () => observer.disconnect();
  }, [grid]);

  // Add touch event listeners to the grid container
  useEffect(() => {
    const gridContainer = gridContainerRef.current;
    if (!gridContainer) return;

    const handleTouchMoveEvent: EventListener = (e) => {
      e.preventDefault(); // Prevent scrolling while dragging
      handleTouchMove(e as TouchEvent);
    };

    gridContainer.addEventListener("touchmove", handleTouchMoveEvent, {
      passive: false,
    });
    return () => {
      gridContainer.removeEventListener("touchmove", handleTouchMoveEvent);
    };
  }, [disabled, isDragging, selection]);

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">
      <div
        className={cn(
          "relative bg-card rounded-lg shadow-lg p-4",
          disabled && "opacity-75"
        )}
        onMouseLeave={() => {
          setSelection([]);
          setIsDragging(false);
        }}
        onMouseUp={handleCellMouseUp}
        onTouchEnd={handleTouchEnd}
      >
        <div ref={gridContainerRef} className="relative word-search-grid">
          {/* Word highlights */}
          {foundWords.map((foundWord, index) => (
            <div
              key={`highlight-${index}`}
              className={`absolute ${foundWord.color} shadow-sm backdrop-blur-[1px]`}
              style={calculateHighlightStyle(foundWord.startPos, foundWord.endPos)}
            />
          ))}

          {/* First letter highlight */}
          {firstLetterPosition && clickedWord?.colorIndex !== undefined && (
            <div
              className={`absolute ${
                HIGHLIGHT_COLORS[clickedWord.colorIndex]
              } shadow-sm backdrop-blur-[1px]`}
              style={calculateFirstLetterStyle(firstLetterPosition)}
            />
          )}

          {/* Selection highlight */}
          {selection.length >= 2 && (
            <div
              className="absolute shadow-sm backdrop-blur-[1px]"
              style={getSelectionStyle()}
            />
          )}

          {/* Grid */}
          <div
            ref={gridCellsRef}
            className="grid gap-1 relative z-20"
            style={{
              gridTemplateColumns: `repeat(${grid[0].length}, minmax(0, 1fr))`,
            }}
          >
            {grid.map((row, rowIndex) =>
              row.map((letter, colIndex) => (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                  }}
                  transition={{
                    delay: (rowIndex * row.length + colIndex) * 0.02,
                  }}
                  className={cn(
                    "aspect-square flex items-center justify-center text-lg font-bold rounded select-none",
                    "border-2 border-primary/20 hover:border-primary/40 transition-colors",
                    "touch-none" // Prevent touch selection
                  )}
                  data-cell-coords={`${rowIndex},${colIndex}`}
                  onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                  onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                  onTouchStart={() => handleTouchStart(rowIndex, colIndex)}
                >
                  {letter}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Word List */}
      <div className="bg-card rounded-lg shadow-lg p-4 w-full max-w-[30rem] mx-auto">
        <h3 className="text-lg font-medium mb-2">
          Words to Find ({words.length - foundWords.length} remaining)
        </h3>
        <div className="flex flex-wrap gap-2">
          {words.map(({ word, direction }) => {
            const isFound = isWordFound(word);
            const hintLevel = hintsUsed.get(word) || 0;
            const deduction = hintDeductions.get(word) || 0;

            return (
              <div
                key={word}
                onClick={() => !isFound && handleWordClick(word)}
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-2",
                  isFound
                    ? "bg-primary/20 text-primary"
                    : hintLevel > 0
                    ? "bg-yellow-500/20 text-yellow-500"
                    : "bg-secondary hover:bg-primary/10 cursor-pointer"
                )}
              >
                <span>{word}</span>
                {(hintLevel > 0 || selectedHintWord === word) && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xs opacity-70"
                  >
                    {direction}
                  </motion.span>
                )}
                {hintLevel > 0 && (
                  <span className="text-xs opacity-70">
                    (-{deduction} points)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
