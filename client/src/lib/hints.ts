export const getHintUnlockWordCount = (value?: number | null) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? Math.floor(numericValue)
    : 3;
};
