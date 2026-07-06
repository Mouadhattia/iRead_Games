import { useEffect, useState } from "react";

const STORAGE_KEY = "iread-games-display-preferences";

type DisplayPreferences = {
  darkMode: boolean;
  colorblindMode: boolean;
};

const defaultPreferences: DisplayPreferences = {
  darkMode: false,
  colorblindMode: false,
};

function loadPreferences(): DisplayPreferences {
  if (typeof window === "undefined") return defaultPreferences;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultPreferences;

    return {
      ...defaultPreferences,
      ...JSON.parse(stored),
    };
  } catch {
    return defaultPreferences;
  }
}

export function useAccessibilityPreferences() {
  const [preferences, setPreferences] =
    useState<DisplayPreferences>(loadPreferences);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle("dark", preferences.darkMode);
    root.classList.toggle("colorblind", preferences.colorblindMode);
    root.style.colorScheme = preferences.darkMode ? "dark" : "light";

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  return {
    ...preferences,
    setDarkMode: (darkMode: boolean) =>
      setPreferences((current) => ({ ...current, darkMode })),
    setColorblindMode: (colorblindMode: boolean) =>
      setPreferences((current) => ({ ...current, colorblindMode })),
  };
}
