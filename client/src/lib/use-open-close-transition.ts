import { useEffect, useRef } from "react";

// Fires `onClose` once per genuine open->close transition of `open` (not
// merely whenever `open` is false, which is also true before anything has
// opened yet). Same technique `game-recap.ts`'s `useDeferredDailyRecap` uses
// to sequence the daily leaderboard dialog and the parent-frame recap
// postMessage without stacking them — kept as a separate hook here (rather
// than refactoring that already-verified one to share it) so this addition
// can't change its existing, tested timing.
export function useOpenCloseTransition(
  open: boolean,
  onClose: () => void
): void {
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      onClose();
    }
  }, [open, onClose]);
}
