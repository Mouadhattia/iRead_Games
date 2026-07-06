import { apiRequest, fetchJsonOrThrow } from "./queryClient";

export function unwrapGameResult(payload: any) {
  return payload?.result ?? payload ?? {};
}

export function isCompletedGameResult(result: any): boolean {
  const completed = result?.completed;
  return completed === true || completed === 1 || completed === "1";
}

export function isCurrentGameResult(
  result: any,
  game: string,
  bookId: string | null,
  date: string | null
) {
  if (!result?.id || !bookId) return false;

  return (
    Number(result.book_id) === Number(bookId) &&
    String(result.game || "").toLowerCase() === game.toLowerCase() &&
    (!date || result.day === date)
  );
}

export function isCompletedCurrentGameResult(
  result: any,
  game: string,
  bookId: string | null,
  date: string | null
) {
  return (
    isCurrentGameResult(result, game, bookId, date) &&
    isCompletedGameResult(result)
  );
}

interface DailyResultPayload {
  game: string;
  bookId: string | null;
  date?: string | null;
  userId?: string | null;
  score: number;
  wordsLearned?: string[];
  completed: boolean;
  timeSpentSeconds?: number;
}

interface SaveOrUpdateDailyResultPayload extends DailyResultPayload {
  existingResult?: any;
}

function buildDailyResultBody({
  game,
  bookId,
  date,
  userId,
  score,
  wordsLearned,
  completed,
  timeSpentSeconds,
}: DailyResultPayload) {
  return {
    game,
    book_id: bookId,
    score,
    day: date || undefined,
    user_id: userId || undefined,
    words_learned: wordsLearned,
    completed,
    time_spent_seconds: timeSpentSeconds,
  };
}

export async function fetchDailyResultStatus({
  game,
  bookId,
  date,
  userId,
}: {
  game: string;
  bookId: string | null;
  date?: string | null;
  userId?: string | null;
}): Promise<any> {
  if (!bookId) return {};

  const params = new URLSearchParams({ id: bookId, game });
  if (date) params.set("date", date);
  if (userId) params.set("user_id", userId);

  return fetchJsonOrThrow<any>(`/api/game-result/status?${params.toString()}`);
}

export async function saveDailyResult(payload: DailyResultPayload) {
  const response = await apiRequest(
    "POST",
    "/api/save-result",
    buildDailyResultBody(payload)
  );
  const data = await response.json();
  return unwrapGameResult(data);
}

export async function updateDailyResult(
  resultId: string | number,
  payload: Omit<DailyResultPayload, "game" | "bookId" | "date" | "userId">
) {
  const response = await apiRequest("POST", "/api/update-result", {
    id: resultId,
    score: payload.score,
    words_learned: payload.wordsLearned,
    completed: payload.completed,
    time_spent_seconds: payload.timeSpentSeconds,
  });
  const data = await response.json();
  return unwrapGameResult(data);
}

export async function saveOrUpdateDailyResult({
  existingResult,
  game,
  bookId,
  date,
  userId,
  score,
  wordsLearned,
  completed,
  timeSpentSeconds,
}: SaveOrUpdateDailyResultPayload) {
  if (!bookId) return null;

  if (isCurrentGameResult(existingResult, game, bookId, date || null)) {
    return updateDailyResult(existingResult.id, {
      score,
      wordsLearned,
      completed,
      timeSpentSeconds,
    });
  }

  if (!completed) return null;

  return saveDailyResult({
    game,
    bookId,
    date,
    userId,
    score,
    wordsLearned,
    completed,
    timeSpentSeconds,
  });
}
