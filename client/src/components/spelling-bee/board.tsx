import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { hexGrid, hexOffset, hexGridExtent } from "@/lib/hex-grid";

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
const TILE_SPACING = 1.04; // >1 leaves a small gap between adjacent hexagons
const GRID = hexGrid(RING_DEPTH);
const OUTER_CELLS = GRID.slice(1); // everything but the center cell, in ring order
const EXTENT = hexGridExtent(RING_DEPTH, TILE_SPACING);

// Pointy-top hexagon, matching the original tile silhouette. Traced with
// stroke-linejoin="round" (fill == stroke color) so each corner reads as
// gently rounded instead of sharp.
const HEX_POINTS = "50,3 95.6,26.5 95.6,73.5 50,97 4.4,73.5 4.4,26.5";
// Same hexagon inset ~8% toward its own center — used as the "fill" layer on
// top of a full-size "border" layer, giving active tiles a thin visible ring.
const HEX_POINTS_INSET = "50,6.76 91.95,28.38 91.95,71.62 50,93.24 8.05,71.62 8.05,28.38";

export default function SpellingBeeBoard({
  letters,
  centerLetter,
  onLetterClick,
  revealedWord = null,
  disabled = false,
}: SpellingBeeBoardProps) {
  const hintedLetter = revealedWord ? revealedWord[0] : null;

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
          // Fluid tile size: comfortable tap targets on phones, capped on desktop.
          ["--bee-tile" as string]: "clamp(2.75rem, 9vw, 4.25rem)",
          width: `calc(var(--bee-tile) * ${EXTENT.width})`,
          height: `calc(var(--bee-tile) * ${EXTENT.height})`,
          maxWidth: "min(90vw, 460px)",
        }}
      >
        {/* Center hexagon: the mandatory letter */}
        <motion.button
          type="button"
          onClick={() => !disabled && onLetterClick(centerLetter)}
          disabled={disabled}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15 }}
          className={cn(
            "absolute z-10 flex items-center justify-center text-[clamp(1.05rem,3.6vw,1.5rem)] font-bold text-white transition-transform duration-150",
            "hover:-translate-y-0.5 hover:brightness-95 active:translate-y-0 active:brightness-90",
            "disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100",
            hintedLetter === centerLetter && "text-yellow-950"
          )}
          style={{
            left: "50%",
            top: "50%",
            width: "var(--bee-tile)",
            height: "var(--bee-tile)",
            transform: "translate(-50%, -50%)",
            filter:
              "drop-shadow(0 4px 8px hsl(var(--bee-center) / 0.35)) drop-shadow(0 1px 2px rgb(0 0 0 / 0.15))",
          }}
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
            <polygon
              points={HEX_POINTS}
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
        </motion.button>

        {/* Ring 1 + ring 2: every other honeycomb position, active or not */}
        {OUTER_CELLS.map((cell, index) => {
          const letter = letters?.[index];
          const isActive = Boolean(letter);
          const { x, y } = hexOffset(cell, TILE_SPACING);
          const isHinted = isActive && hintedLetter === letter;

          if (!isActive) {
            return (
              <div
                key={`${cell.q},${cell.r}`}
                aria-hidden="true"
                className="absolute"
                style={{
                  left: `calc(50% + ${x} * var(--bee-tile))`,
                  top: `calc(50% + ${y} * var(--bee-tile))`,
                  width: "var(--bee-tile)",
                  height: "var(--bee-tile)",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
                  <polygon
                    points={HEX_POINTS}
                    fill="hsl(var(--muted) / 0.55)"
                    stroke="hsl(var(--border))"
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            );
          }

          return (
            <motion.button
              key={`${cell.q},${cell.r}`}
              type="button"
              onClick={() => !disabled && onLetterClick(letter)}
              disabled={disabled}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05 + index * 0.04 }}
              className={cn(
                "absolute flex items-center justify-center text-[clamp(1.05rem,3.6vw,1.5rem)] font-bold text-card-foreground transition-transform duration-150",
                "hover:-translate-y-0.5 hover:brightness-[0.97] active:translate-y-0 active:brightness-95",
                "disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100",
                isHinted && "text-yellow-950"
              )}
              style={{
                left: `calc(50% + ${x} * var(--bee-tile))`,
                top: `calc(50% + ${y} * var(--bee-tile))`,
                width: "var(--bee-tile)",
                height: "var(--bee-tile)",
                transform: "translate(-50%, -50%)",
                filter: "drop-shadow(0 2px 3px rgb(0 0 0 / 0.12))",
              }}
            >
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
                <polygon
                  points={HEX_POINTS}
                  fill={isHinted ? "hsl(var(--tile-present))" : "hsl(var(--border))"}
                  stroke={isHinted ? "hsl(var(--tile-present))" : "hsl(var(--border))"}
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
                <polygon
                  points={HEX_POINTS_INSET}
                  fill={isHinted ? "hsl(var(--tile-present) / 0.3)" : "hsl(var(--card))"}
                  stroke={isHinted ? "hsl(var(--tile-present) / 0.3)" : "hsl(var(--card))"}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </svg>
              <span className="relative">{letter}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
