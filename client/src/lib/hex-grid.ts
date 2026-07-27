// Axial coordinates for a "pointy-top" hexagon (point at top/bottom, flat left/right
// edges) — the same orientation used by the Bee Genius tile shape. Ring 0 is the
// center cell, ring 1 has 6 cells, ring 2 has 12 cells, and so on (ring n has 6n cells).

export interface HexCell {
  q: number;
  r: number;
}

// The 6 neighbor directions, ordered clockwise starting from upper-right.
const HEX_DIRECTIONS: HexCell[] = [
  { q: 1, r: -1 }, // upper-right
  { q: 1, r: 0 }, // right
  { q: 0, r: 1 }, // lower-right
  { q: -1, r: 1 }, // lower-left
  { q: -1, r: 0 }, // left
  { q: 0, r: -1 }, // upper-left
];

// Every cell exactly `radius` steps away from the center, walked in a single
// clockwise loop (standard hex-ring traversal).
export function hexRing(radius: number): HexCell[] {
  if (radius <= 0) return [{ q: 0, r: 0 }];

  const cells: HexCell[] = [];
  let cell: HexCell = {
    q: HEX_DIRECTIONS[4].q * radius,
    r: HEX_DIRECTIONS[4].r * radius,
  };

  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < radius; step++) {
      cells.push(cell);
      cell = { q: cell.q + HEX_DIRECTIONS[side].q, r: cell.r + HEX_DIRECTIONS[side].r };
    }
  }

  return cells;
}

// All cells within `maxRadius` rings of the center, ordered ring-by-ring
// (center first, then ring 1, then ring 2, ...).
export function hexGrid(maxRadius: number): HexCell[] {
  const cells: HexCell[] = [{ q: 0, r: 0 }];
  for (let radius = 1; radius <= maxRadius; radius++) {
    cells.push(...hexRing(radius));
  }
  return cells;
}

// A pointy-top regular hexagon is taller than it is wide by this ratio, so a tile
// box sized off its width must scale its height by it — otherwise the shape is
// squashed and the rings below no longer tessellate.
export const HEX_ASPECT = 2 / Math.sqrt(3); // ≈ 1.1547

// Row-to-row spacing is 3/4 of the hexagon's HEIGHT, which in units of its width
// works out to √3/2. Using 0.75 here (the height-relative figure) against a
// width-based tile size is what makes neighbouring rings overlap.
const ROW_SPACING = Math.sqrt(3) / 2; // ≈ 0.8660

// Offset from the center cell, expressed in units of the tile's WIDTH (both axes,
// so a single CSS length drives the layout). `spacing` > 1 adds a uniform gap.
export function hexOffset(cell: HexCell, spacing = 1) {
  return {
    x: spacing * (cell.q + cell.r / 2),
    y: spacing * ROW_SPACING * cell.r,
  };
}

// Bounding box (in units of the tile's width) needed to fit every cell within
// `maxRadius` rings, including the tile itself so nothing clips at the edges.
export function hexGridExtent(maxRadius: number, spacing = 1) {
  return {
    width: spacing * 2 * maxRadius + 1,
    height: spacing * 2 * ROW_SPACING * maxRadius + HEX_ASPECT,
  };
}
