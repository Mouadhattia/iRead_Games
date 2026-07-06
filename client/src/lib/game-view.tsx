import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type GameView = "kids" | "teens";

interface GameViewContextValue {
  view: GameView;
  setView: (view: GameView) => void;
  isKids: boolean;
  isTeens: boolean;
  viewClassName: string;
}

const STORAGE_KEY = "iread-games:view";
const DEFAULT_VIEW: GameView = "teens";
const GameViewContext = createContext<GameViewContextValue | null>(null);

const normalizeGameView = (value: unknown): GameView =>
  value === "kids" || value === "teens" ? value : DEFAULT_VIEW;

const readStoredView = (): GameView => {
  if (typeof window === "undefined") return DEFAULT_VIEW;
  const queryParams = new URLSearchParams(window.location.search);
  const queryView = normalizeGameView(queryParams.get("view"));
  if (queryParams.has("view")) {
    window.localStorage.setItem(STORAGE_KEY, queryView);
    return queryView;
  }
  return normalizeGameView(window.localStorage.getItem(STORAGE_KEY));
};

export function GameViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<GameView>(readStoredView);

  const setView = (nextView: GameView) => {
    setViewState(nextView);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextView);
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.dataset.gameView = view;
    document.documentElement.classList.toggle("game-view-kids", view === "kids");
    document.documentElement.classList.toggle(
      "game-view-teens",
      view === "teens"
    );
  }, [view]);

  const value = useMemo<GameViewContextValue>(
    () => ({
      view,
      setView,
      isKids: view === "kids",
      isTeens: view === "teens",
      viewClassName: view === "kids" ? "game-view-kids" : "game-view-teens",
    }),
    [view]
  );

  return (
    <GameViewContext.Provider value={value}>
      {children}
    </GameViewContext.Provider>
  );
}

export function useGameView() {
  const context = useContext(GameViewContext);
  if (!context) {
    throw new Error("useGameView must be used inside GameViewProvider");
  }
  return context;
}
