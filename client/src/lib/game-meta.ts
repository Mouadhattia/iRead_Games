import { Brain, Hexagon, Grid, Search, type LucideIcon } from "lucide-react";

export type GameKey =
  | "think-word"
  | "bee-genius"
  | "intellect-link"
  | "word-explorer";

export interface GameMeta {
  label: string;
  icon: LucideIcon;
  practiceRoute: string;
  dailyRoute: string;
}

export const GAME_META: Record<GameKey, GameMeta> = {
  "think-word": {
    label: "Think Word",
    icon: Brain,
    practiceRoute: "/game",
    dailyRoute: "/daily-challenge",
  },
  "bee-genius": {
    label: "Bee Genius",
    icon: Hexagon,
    practiceRoute: "/spelling-bee",
    dailyRoute: "/daily-spelling-bee",
  },
  "intellect-link": {
    label: "Intellect Link",
    icon: Grid,
    practiceRoute: "/strands",
    dailyRoute: "/daily-strands",
  },
  "word-explorer": {
    label: "Word Explorer",
    icon: Search,
    practiceRoute: "/word-search",
    dailyRoute: "/daily-word-search",
  },
};

export const GAME_KEYS = Object.keys(GAME_META) as GameKey[];
