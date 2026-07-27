import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  hexGrid,
  hexOffset,
  hexGridExtent,
  HEX_ASPECT,
  type HexCell,
} from "@/lib/hex-grid";

interface SpellingBeeBoardProps {
  letters: string[];
  centerLetter: string;
  onLetterClick: (letter: string) => void;
  revealedWord?: string | null;
  disabled?: boolean;
}

// Two concentric rings around the center (1 + 6 + 12 = 19 hexagons), so the honeycomb
// keeps its shape however many letters a puzzle uses today — or adds later.
const RING_DEPTH = 2;
const TILE_GAP = 1.06; // >1 leaves a small, even gap between adjacent hexagons
const OUTER_CELLS = hexGrid(RING_DEPTH).slice(1); // all but the center, in ring order
const EXTENT = hexGridExtent(RING_DEPTH, TILE_GAP);

// The tile box is one hexagon wide and HEX_ASPECT tall, so the polygon below is a
// true regular hexagon rather than a squashed one.
const VIEW_BOX = `0 0 100 ${(100 * HEX_ASPECT).toFixed(2)}`;

// Both polygons are drawn with a matching-colour stroke and round joins, which is
// what softens the six corners. The stroke grows the shape outward by half its
// width, so each polygon is inset by that much to land on the intended size:
// outline = full tile (inradius 48 + stroke 2 = 50 = half the tile width),
// inner = inradius 45 + stroke 1, leaving a ~4% ring of border colour showing.
const HEX_OUTLINE = "50,2.31 98,30.02 98,85.45 50,113.16 2,85.45 2,30.02";
const HEX_INNER = "50,5.78 95,31.76 95,83.72 50,109.70 5,83.72 5,31.76";

// Places a tile's box on the lattice; `--bee-tile` is the hexagon's width.
// The half-tile centering is folded into left/top rather than done with a
// `translate(-50%,-50%)`: framer-motion owns `transform` on the tiles it animates,
// so a transform set here would be overwritten and the tile would hang off its
// lattice point by half its own size.
function cellStyle(cell: HexCell) {
  const { x, y } = hexOffset(cell, TILE_GAP);
  return {
    left: `calc(50% + ${(x - 0.5).toFixed(4)} * var(--bee-tile))`,
    top: `calc(50% + ${(y - HEX_ASPECT / 2).toFixed(4)} * var(--bee-tile))`,
    width: "var(--bee-tile)",
    height: `calc(var(--bee-tile) * ${HEX_ASPECT.toFixed(4)})`,
  };
}

export default function SpellingBeeBoard({
  letters,
  centerLetter,
  onLetterClick,
  revealedWord = null,
  disabled = false,
}: SpellingBeeBoardProps) {
  const hintedLetter = revealedWord ? revealedWord[0] : null;

  // Split the ring cells up front so the unused ones paint *behind* the letters —
  // otherwise the later-rendered inactive tiles wash out the tiles they touch.
  const activeCells = OUTER_CELLS.slice(0, letters?.length ?? 0);
  const inactiveCells = OUTER_CELLS.slice(letters?.length ?? 0);

  return (
    <div className="flex flex-col items-center justify-center">
      {revealedWord && (
        <div className="mb-3 flex justify-center">
          <div className="rounded-full border border-yellow-500/50 bg-yellow-100 px-4 py-1.5 text-center text-sm font-bold uppercase tracking-normal text-yellow-950 shadow-sm">
            {revealedWord}
          </div>
        </div>
      )}
      <div
        className="relative"
        style={{
          // Fluid tile width: comfortable tap targets on phones, capped on desktop.
          ["--bee-tile" as string]: "clamp(2.6rem, 8.5vw, 4rem)",
          width: `calc(var(--bee-tile) * ${EXTENT.width.toFixed(4)})`,
          height: `calc(var(--bee-tile) * ${EXTENT.height.toFixed(4)})`,
        }}
      >
        {/* Unused honeycomb positions: visible for shape, but inert */}
        {inactiveCells.map((cell) => (
          <div
            key={`${cell.q},${cell.r}`}
            aria-hidden="true"
            className="absolute z-0"
            style={cellStyle(cell)}
          >
            <svg viewBox={VIEW_BOX} className="h-full w-full">
              <polygon
                points={HEX_OUTLINE}
                fill="hsl(var(--muted) / 0.6)"
                stroke="hsl(var(--muted) / 0.6)"
                strokeWidth={4}
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ))}

        {/* Active letters, ring by ring */}
        {activeCells.map((cell, index) => {
          const letter = letters[index];
          const isHinted = hintedLetter === letter;

          return (
            <motion.div
              key={`${cell.q},${cell.r}`}
              className="absolute z-10"
              style={cellStyle(cell)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05 + index * 0.04 }}
            >
              <button
                type="button"
                onClick={() => !disabled && onLetterClick(letter)}
                disabled={disabled}
                className={cn(
                  "relative flex h-full w-full items-center justify-center font-bold transition-transform duration-150",
                  "hover:-translate-y-0.5 active:translate-y-0",
                  "disabled:cursor-not-allowed disabled:hover:translate-y-0",
                  isHinted ? "text-yellow-950" : "text-card-foreground"
                )}
                style={{
                  fontSize: "calc(var(--bee-tile) * 0.4)",
                  filter: "drop-shadow(0 2px 3px rgb(0 0 0 / 0.12))",
                }}
              >
                <svg viewBox={VIEW_BOX} className="absolute inset-0 h-full w-full">
                  <polygon
                    points={HEX_OUTLINE}
                    fill={isHinted ? "hsl(var(--tile-present))" : "hsl(var(--border))"}
                    stroke={isHinted ? "hsl(var(--tile-present))" : "hsl(var(--border))"}
                    strokeWidth={4}
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={HEX_INNER}
                    fill={isHinted ? "hsl(var(--tile-present) / 0.25)" : "hsl(var(--card))"}
                    stroke={isHinted ? "hsl(var(--tile-present) / 0.25)" : "hsl(var(--card))"}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="relative">{letter}</span>
              </button>
            </motion.div>
          );
        })}

        {/* Center hexagon: the mandatory letter */}
        <motion.div
          className="absolute z-20"
          style={cellStyle({ q: 0, r: 0 })}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <button
            type="button"
            onClick={() => !disabled && onLetterClick(centerLetter)}
            disabled={disabled}
            className={cn(
              "relative flex h-full w-full items-center justify-center font-bold transition-transform duration-150",
              "hover:-translate-y-0.5 active:translate-y-0",
              "disabled:cursor-not-allowed disabled:hover:translate-y-0",
              hintedLetter === centerLetter ? "text-yellow-950" : "text-white"
            )}
            style={{
              fontSize: "calc(var(--bee-tile) * 0.4)",
              filter:
                "drop-shadow(0 4px 8px hsl(var(--bee-center) / 0.35)) drop-shadow(0 1px 2px rgb(0 0 0 / 0.15))",
            }}
          >
            <svg viewBox={VIEW_BOX} className="absolute inset-0 h-full w-full">
              <polygon
                points={HEX_OUTLINE}
                fill={
                  hintedLetter === centerLetter
                    ? "hsl(var(--tile-present))"
                    : "hsl(var(--bee-center))"
                }
                stroke={
                  hintedLetter === centerLetter
                    ? "hsl(var(--tile-present))"
                    : "hsl(var(--bee-center))"
                }
                strokeWidth={4}
                strokeLinejoin="round"
              />
            </svg>
            <span className="relative">{centerLetter}</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
