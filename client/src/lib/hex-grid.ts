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

// Pixel offset (in tile-size units, relative to the center cell) for a pointy-top
// hex laid out edge-to-edge. `spacing` > 1 adds a uniform gap between tiles.
export function hexOffset(cell: HexCell, spacing = 1) {
  return {
    x: spacing * (cell.q + cell.r / 2),
    y: spacing * 0.75 * cell.r,
  };
}

// Bounding box (in tile-size units) needed to fit every cell within `maxRadius`
// rings, including the tile's own width/height so nothing gets clipped at the edges.
export function hexGridExtent(maxRadius: number, spacing = 1) {
  return {
    width: spacing * 2 * maxRadius + 1,
    height: spacing * 1.5 * maxRadius + 1,
  };
}
