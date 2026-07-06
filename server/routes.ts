import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import * as http from "http";
import * as https from "https";
// import { storage } from "./storage";
import { z } from "zod";
import { calculateWordScore, predefinedWords } from "./words";
import { subDays } from "date-fns";
import { GameConfig } from "../shared/config";
import {
  createStorage,
  NO_WORDS_AVAILABLE_MESSAGE,
  NoWordsAvailableError,
} from "./storage.ts";
import { calculateWordPoints } from "./words.ts";
import { generateGridWithWords } from "@/lib/strands.ts";
import { buildSpellingBeeHives } from "./spelling-bee.ts";

const validateGuessSchema = z.object({
  guess: z.string(),
  wordLength: z.number(),
});

const validateSpellingBeeSchema = z.object({
  word: z.string(),
});

const validateStrandsWordSchema = z.object({
  word: z.string(),
});

const strandsProgressSchema = z.object({
  userId: z.string(),
  puzzleId: z.string(),
  discoveredWords: z.array(z.string()),
  hintsUsed: z.number(),
  score: z.number(),
  spangramFound: z.boolean(),
  startedAt: z.string(),
  lastPlayedAt: z.string(),
  completed: z.boolean(),
});

const wordSearchDifficultySchema = z.enum(["easy", "medium", "hard", "expert"]);

interface PlacedWord {
  word: string;
  direction: string;
}

type StorageInstance = ReturnType<typeof createStorage>;
type IreadGameType =
  | "bee-genius"
  | "word-explorer"
  | "think-word"
  | "intellect-link";

interface IreadGamePayload {
  book_id: number;
  game_type: IreadGameType;
  date: string;
  words: string[];
  timer_seconds?: number;
  timer_enabled?: boolean | number | string;
  max_hints?: number;
}

interface JsonRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface JsonResponse {
  ok: boolean;
  status: number;
  data: any;
}

class UpstreamGameError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly code = "UPSTREAM_GAME_ERROR"
  ) {
    super(message);
    this.name = "UpstreamGameError";
  }
}

function normalizeId(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return undefined;

  const id = raw.trim();
  if (!id || id === "null" || id === "undefined") return undefined;

  return id;
}

function getRequestBookId(req: Request): string | undefined {
  return normalizeId(req.query.id ?? req.body?.book_id);
}

function sendRouteError(
  res: Response,
  error: unknown,
  fallbackMessage: string
) {
  if (
    error instanceof NoWordsAvailableError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "NO_WORDS_AVAILABLE")
  ) {
    return res.status(404).json({
      code: "NO_WORDS_AVAILABLE",
      error: NO_WORDS_AVAILABLE_MESSAGE,
    });
  }

  if (
    error instanceof UpstreamGameError ||
    (typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number")
  ) {
    const status = Number((error as { status: number }).status) || 500;
    const message =
      error instanceof Error ? error.message : fallbackMessage;
    const code =
      "code" in (error as Record<string, unknown>)
        ? (error as { code?: string }).code
        : "UPSTREAM_GAME_ERROR";
    return res.status(status).json({ code, error: message });
  }

  return res.status(500).json({ error: fallbackMessage });
}

function normalizeAssignedWord(word: string): string {
  return word.toUpperCase().replace(/[^A-Z]/g, "");
}

function normalizeAssignedWords(words: string[]): string[] {
  return [
    ...new Set(
      words
        .filter((word): word is string => typeof word === "string")
        .map(normalizeAssignedWord)
        .filter(Boolean)
    ),
  ];
}

function getRequestDate(req: Request): string | undefined {
  return normalizeId(req.query.date);
}

function getRequestSchoolId(req: Request): string | undefined {
  return normalizeId(
    req.query.school_id ?? req.query.school ?? req.query.shcool_id
  );
}

function getRequestPackId(req: Request): string | undefined {
  return normalizeId(req.query.pack_id);
}

function getExpiresAt(dateKey: string): Date {
  const expiresAt = new Date(dateKey);
  expiresAt.setHours(24, 0, 0, 0);
  return expiresAt;
}

function isTimerEnabled(value: unknown): boolean {
  return value !== false && value !== 0 && value !== "0" && value !== "false";
}

function parseJsonSafe(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function requestJson(
  requestUrl: string | URL,
  options: JsonRequestOptions = {}
): Promise<JsonResponse> {
  const url = typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl;
  const client = url.protocol === "https:" ? https : http;
  const body = options.body;
  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  if (body && !headers["Content-Length"]) {
    headers["Content-Length"] = Buffer.byteLength(body).toString();
  }

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: options.method || "GET",
        headers,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const status = response.statusCode || 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            data: parseJsonSafe(text),
          });
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function unwrapGameResultPayload(payload: any) {
  return payload?.result ?? payload ?? {};
}

function isCompletedResultPayload(result: any): boolean {
  const completed = result?.completed;
  return completed === true || completed === 1 || completed === "1";
}

function isCompletedRequest(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  );
}

async function fetchIreadGamePayload(
  req: Request,
  gameType: IreadGameType
): Promise<IreadGamePayload> {
  const bookId = getRequestBookId(req);
  if (!bookId) {
    throw new UpstreamGameError("No book ID provided", 400, "BOOK_ID_REQUIRED");
  }
  if (!process.env.IREAD_API) {
    throw new UpstreamGameError(
      "IRead API URL is not configured",
      500,
      "IREAD_API_REQUIRED"
    );
  }

  const baseUrl = process.env.IREAD_API.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/reader/get_book_games/${bookId}/${gameType}`);
  const date = getRequestDate(req);
  if (date) url.searchParams.set("date", date);
  const schoolId = getRequestSchoolId(req);
  if (schoolId) url.searchParams.set("school_id", schoolId);

  const response = await requestJson(url, {
    headers: {
      Accept: "application/json",
      Cookie: req.headers.cookie || "",
    },
  });
  const data = response.data;

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      "No words available today. Please try again later.";
    const status = [400, 401, 403, 404, 409].includes(response.status)
      ? response.status
      : 500;
    throw new UpstreamGameError(
      message,
      status,
      data?.code || "IREAD_GAME_ROUTE_FAILED"
    );
  }

  const words = normalizeAssignedWords(
    Array.isArray(data?.words) ? data.words : []
  );
  if (!words.length) {
    throw new NoWordsAvailableError();
  }

  return {
    ...data,
    book_id: Number(data.book_id || bookId),
    game_type: gameType,
    date:
      data.date || getRequestDate(req) || new Date().toISOString().slice(0, 10),
    words,
  };
}

function placeAssignedWordsInGrid(words: string[], minimumSize = 8) {
  const longestWord = Math.max(...words.map((word) => word.length), minimumSize);
  const gridSize = Math.max(minimumSize, longestWord);
  const grid = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(""));
  const placedWords: PlacedWord[] = [];

  for (const word of words) {
    const result = placeWord(grid, word);
    if (result.success && result.direction) {
      placedWords.push({ word, direction: result.direction });
    }
  }

  if (!placedWords.length) {
    throw new NoWordsAvailableError();
  }

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x] === "") {
        grid[y][x] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
    }
  }

  return { grid, placedWords };
}

function buildStrandsPuzzles(words: string[]) {
  const chunks = [];
  for (let index = 0; index < words.length; index += 3) {
    const chunk = words.slice(index, index + 3);
    if (chunk.length === 3) chunks.push(chunk);
  }

  return chunks.map((chunk, index) => {
    const configuredSize =
      GameConfig.dailyChallenge.strands.gridSizes[
        index as keyof typeof GameConfig.dailyChallenge.strands.gridSizes
      ] || 7;
    const baseSize = Math.max(
      configuredSize,
      ...chunk.map((word) => word.length)
    );

    for (let size = baseSize; size <= baseSize + 4; size++) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const [grid, wordPositions] = generateGridWithWords(
          { rows: size, cols: size },
          chunk
        );
        const placedWords = wordPositions.map(([word]) => word);
        if (placedWords.length === chunk.length) {
          return {
            letters: grid,
            size,
            themedWords: placedWords,
            wordPositions,
          };
        }
      }
    }

    throw new NoWordsAvailableError();
  });
}

function getDirectionSymbol(dx: number, dy: number): string {
  if (dx === 1 && dy === 0) return "→"; // Right
  if (dx === 0 && dy === 1) return "↓"; // Down
  if (dx === 1 && dy === 1) return "↘"; // Down-Right
  if (dx === 1 && dy === -1) return "↗"; // Up-Right
  return "";
}

function placeWord(
  grid: string[][],
  word: string,
  forcedDirection?: "horizontal" | "vertical" | "diagonal"
): { success: boolean; direction?: string } {
  const height = grid.length;
  const width = grid[0].length;
  const directions = forcedDirection
    ? forcedDirection === "diagonal"
      ? [
          { dx: 1, dy: 1 }, // diagonal down-right
          { dx: 1, dy: -1 }, // diagonal up-right
        ]
      : [
          {
            dx: forcedDirection === "horizontal" ? 1 : 0,
            dy: forcedDirection === "vertical" ? 1 : 0,
          },
        ]
    : [
        { dx: 1, dy: 0 }, // horizontal
        { dx: 0, dy: 1 }, // vertical
        { dx: 1, dy: 1 }, // diagonal down-right
        { dx: 1, dy: -1 }, // diagonal up-right
      ];

  // Try 100 times to place the word
  for (let attempt = 0; attempt < 100; attempt++) {
    const direction = directions[Math.floor(Math.random() * directions.length)];

    // Calculate valid ranges for starting positions based on direction
    const maxStartX = width - word.length * Math.max(0, direction.dx);
    const startX = Math.floor(Math.random() * (maxStartX || 1));

    let startY;
    if (direction.dy < 0) {
      // For upward diagonals, start from bottom area
      const minStartY = word.length - 1;
      startY = minStartY + Math.floor(Math.random() * (height - minStartY));
    } else {
      // For downward or horizontal words
      const maxStartY = height - word.length * Math.max(0, direction.dy);
      startY = Math.floor(Math.random() * (maxStartY || 1));
    }

    // Validate bounds before attempting placement
    if (
      startX >= 0 &&
      startX < width &&
      startY >= 0 &&
      startY < height &&
      startX + word.length * direction.dx <= width &&
      startY + word.length * direction.dy <= height &&
      startY + word.length * direction.dy >= 0
    ) {
      // Check if the word can be placed without conflicts
      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const x = startX + i * direction.dx;
        const y = startY + i * direction.dy;

        // Double check bounds for each position
        if (x < 0 || x >= width || y < 0 || y >= height) {
          canPlace = false;
          break;
        }

        const currentCell = grid[y][x];
        if (currentCell !== "" && currentCell !== word[i]) {
          canPlace = false;
          break;
        }
      }

      // Place the word if possible
      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          const x = startX + i * direction.dx;
          const y = startY + i * direction.dy;
          grid[y][x] = word[i];
        }
        return {
          success: true,
          direction: getDirectionSymbol(direction.dx, direction.dy),
        };
      }
    }
  }
  return { success: false };
}

export function registerRoutes(app: Express): Server {
  const storageByBookId = new Map<string, StorageInstance>();
  const generalStorage = createStorage();

  async function getGeneralStorage() {
    await generalStorage.ready;
    return generalStorage;
  }

  async function getBookStorage(id: string) {
    let storage = storageByBookId.get(id);
    if (!storage) {
      storage = createStorage(id);
      storageByBookId.set(id, storage);
    }

    await storage.ready;
    return storage;
  }

  async function requireBookStorage(req: Request) {
    const id = getRequestBookId(req);
    if (!id) return null;
    return getBookStorage(id);
  }

  app.get("/api/word-lengths", async (req, res) => {
    const storage = await getGeneralStorage();
    const availableLengths = await storage.getAvailableWordLengths();
    res.json({ wordLengths: availableLengths });
  });

  app.get("/api/word", async (req, res) => {
    const storage = await requireBookStorage(req);
    if (!storage) {
      return res.status(400).json({ error: "No book ID provided" });
    }

    try {
      const wordLength = parseInt(req.query.length as string) || 5;
      const word = await storage.getIreadWord(wordLength);
      res.json({ word });
    } catch (error) {
      console.error("Error fetching iRead word:", error);
      sendRouteError(res, error, "Failed to fetch word");
    }
  });
  //save result
  app.post("/api/save-result", async (req, res) => {
    const {
      score,
      game,
      user_id,
      book_id,
      time_spent_seconds,
      day,
      completed,
      words_learned,
    } = req.body;
    const today = new Date().toISOString().split("T")[0];
    if (!process.env.IREAD_API) {
      return res.status(500).json({ error: "IRead API URL is not configured" });
    }

    try {
      const baseUrl = process.env.IREAD_API.replace(/\/+$/, "");
      const createBody = {
        score,
        game,
        user_id,
        day: day || today,
        book_id,
        time_spent_seconds,
        completed,
        words_learned,
      };
      const response = await requestJson(
        `${baseUrl}/reader/game-result/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: req.headers.cookie || "",
          },
          body: JSON.stringify(createBody),
        }
      );

      if (!response.ok) {
        return res.status(response.status || 500).json(response.data);
      }

      let result = response.data;
      let status = response.status;
      const savedResult = unwrapGameResultPayload(result);

      if (
        isCompletedRequest(completed) &&
        savedResult?.id &&
        !isCompletedResultPayload(savedResult)
      ) {
        const updateResponse = await requestJson(
          `${baseUrl}/reader/game-result/${savedResult.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Cookie: req.headers.cookie || "",
            },
            body: JSON.stringify({
              score,
              words_learned,
              completed: true,
              time_spent_seconds,
            }),
          }
        );

        if (!updateResponse.ok) {
          return res
            .status(updateResponse.status || 500)
            .json(updateResponse.data);
        }

        result = updateResponse.data;
        status = updateResponse.status;
      }

      console.log(result);
      res.status(status).json(result);
    } catch (error) {
      console.error("Error saving game result:", error);
      res.status(500).json({ error: error });
    }
  });
  // Both daily-run and practice call this after every correct/incorrect
  // word attempt — mode never affects stage, pips, or mastery on the backend,
  // only this app's own separate daily-run ranking.
  app.post("/api/word-attempt", async (req, res) => {
    const {
      user_id,
      book_id,
      word,
      game,
      mode,
      correct,
      hints_used,
      heaviest_hint_tier,
      from_memory,
    } = req.body;

    if (!process.env.IREAD_API) {
      return res.status(500).json({ error: "IRead API URL is not configured" });
    }

    try {
      const baseUrl = process.env.IREAD_API.replace(/\/+$/, "");
      const response = await requestJson(`${baseUrl}/reader/word-attempt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: req.headers.cookie || "",
        },
        body: JSON.stringify({
          user_id,
          book_id,
          word,
          game,
          mode,
          correct,
          hints_used,
          heaviest_hint_tier,
          from_memory,
        }),
      });

      res.status(response.status || 500).json(response.data);
    } catch (error) {
      console.error("Error submitting word attempt:", error);
      res.status(500).json({ error: error });
    }
  });
  app.post("/api/update-result", async (req, res) => {
    const { score, words_learned, completed, id, time_spent_seconds } = req.body;
    if (!id) {
      return res.status(400).json({ error: "No result ID provided" });
    }
    if (!process.env.IREAD_API) {
      return res.status(500).json({ error: "IRead API URL is not configured" });
    }

    try {
      const baseUrl = process.env.IREAD_API.replace(/\/+$/, "");
      const response = await requestJson(
        `${baseUrl}/reader/game-result/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: req.headers.cookie || "",
          },
          body: JSON.stringify({
            score,
            words_learned,
            completed,
            time_spent_seconds,
          }),
        }
      );

      if (!response.ok) {
        return res.status(response.status || 500).json(response.data);
      }

      const result = response.data;
      console.log(result);
      res.json(result);
    } catch (error) {
      console.error("Error update  result:", error);
      res.status(500).json({ error: error });
    }
  });
  app.get("/api/game-result/status", async (req, res) => {
    const bookId = getRequestBookId(req);
    const game = normalizeId(req.query.game);
    if (!bookId || !game) {
      return res
        .status(400)
        .json({ error: "book_id and game query parameters are required" });
    }
    if (!process.env.IREAD_API) {
      return res.status(500).json({ error: "IRead API URL is not configured" });
    }

    try {
      const baseUrl = process.env.IREAD_API.replace(/\/+$/, "");
      const url = new URL(`${baseUrl}/reader/game-result/status`);
      url.searchParams.set("book_id", bookId);
      url.searchParams.set("game", game);
      const date = getRequestDate(req);
      if (date) url.searchParams.set("date", date);
      const userId = normalizeId(req.query.user_id);
      if (userId) url.searchParams.set("user_id", userId);

      const response = await requestJson(url, {
        headers: {
          Accept: "application/json",
          Cookie: req.headers.cookie || "",
        },
      });

      if (response.ok) {
        return res.json(response.data);
      }

      const leaderboardUrl = new URL(`${baseUrl}/reader/game-leaderboard`);
      leaderboardUrl.searchParams.set("book_id", bookId);
      leaderboardUrl.searchParams.set("game", game);
      if (date) leaderboardUrl.searchParams.set("date", date);
      if (userId) leaderboardUrl.searchParams.set("user_id", userId);
      leaderboardUrl.searchParams.set("limit", "100");

      const leaderboardResponse = await requestJson(leaderboardUrl, {
        headers: {
          Accept: "application/json",
          Cookie: req.headers.cookie || "",
        },
      });

      if (!leaderboardResponse.ok) {
        if (response.status !== 404) {
          return res.status(response.status || 500).json(response.data);
        }

        return res
          .status(leaderboardResponse.status || 500)
          .json(leaderboardResponse.data);
      }

      const result = leaderboardResponse.data?.current_user_entry ?? null;
      res.json({
        result,
        completed: Boolean(result),
        played: Boolean(result),
      });
    } catch (error) {
      console.error("Error fetching game result status:", error);
      res.status(500).json({ error: "Failed to fetch game result status" });
    }
  });
  app.get("/api/leaderboard", async (req, res) => {
    const bookId = getRequestBookId(req);
    const game = normalizeId(req.query.game);
    if (!bookId || !game) {
      return res
        .status(400)
        .json({ error: "book_id and game query parameters are required" });
    }
    if (!process.env.IREAD_API) {
      return res.status(500).json({ error: "IRead API URL is not configured" });
    }

    try {
      const baseUrl = process.env.IREAD_API.replace(/\/+$/, "");
      const url = new URL(`${baseUrl}/reader/game-leaderboard`);
      url.searchParams.set("book_id", bookId);
      url.searchParams.set("game", game);
      const date = getRequestDate(req);
      if (date) url.searchParams.set("date", date);
      const limit = normalizeId(req.query.limit);
      if (limit) url.searchParams.set("limit", limit);
      const userId = normalizeId(req.query.user_id);
      if (userId) url.searchParams.set("user_id", userId);

      const response = await requestJson(url, {
        headers: {
          Accept: "application/json",
          Cookie: req.headers.cookie || "",
        },
      });

      if (!response.ok) {
        return res.status(response.status || 500).json(response.data);
      }

      res.json(response.data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });
  app.get("/api/daily-run-suggestions", async (req, res) => {
    const bookId = getRequestBookId(req);
    const game = normalizeId(req.query.game);
    if (!bookId || !game) {
      return res
        .status(400)
        .json({ error: "book_id and game query parameters are required" });
    }
    if (!process.env.IREAD_API) {
      return res.status(500).json({ error: "IRead API URL is not configured" });
    }

    try {
      const baseUrl = process.env.IREAD_API.replace(/\/+$/, "");
      const url = new URL(`${baseUrl}/reader/daily-run-suggestions`);
      url.searchParams.set("book_id", bookId);
      url.searchParams.set("game", game);
      const date = getRequestDate(req);
      if (date) url.searchParams.set("date", date);
      const schoolId = getRequestSchoolId(req);
      if (schoolId) url.searchParams.set("school_id", schoolId);
      const packId = getRequestPackId(req);
      if (packId) url.searchParams.set("pack_id", packId);

      const response = await requestJson(url, {
        headers: {
          Accept: "application/json",
          Cookie: req.headers.cookie || "",
        },
      });

      if (!response.ok) {
        return res.status(response.status || 500).json(response.data);
      }

      res.json(response.data);
    } catch (error) {
      console.error("Error fetching daily run suggestions:", error);
      res.status(500).json({ error: "Failed to fetch daily run suggestions" });
    }
  });
  app.get("/api/refresh", async (req, res) => {
    const storage = await requireBookStorage(req);
    if (!storage) {
      return res.status(400).json({ error: "No book ID provided" });
    }

    try {
      await storage.refreshDailyWords();
      res.json({ message: "Words refreshed" });
    } catch (error) {
      console.error("Error refreshing words:", error);
      sendRouteError(res, error, "Failed to refresh words");
    }
  });

  app.get("/api/daily-challenge", async (req, res) => {
    try {
      const assignedGame = await fetchIreadGamePayload(req, "think-word");
      res.json({
        id: Date.parse(assignedGame.date),
        date: assignedGame.date,
        words: assignedGame.words,
        packSize: assignedGame.words.length,
        expiresAt: getExpiresAt(assignedGame.date),
        timerSeconds: assignedGame.timer_seconds,
        timerEnabled: isTimerEnabled(assignedGame.timer_enabled),
        gameType: assignedGame.game_type,
      });
    } catch (error) {
      console.error("Error getting daily challenge:", error);
      sendRouteError(res, error, "Failed to fetch daily challenge");
    }
  });

  app.get("/api/daily-challenges/past", async (req, res) => {
    const storage = await getGeneralStorage();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    const challenges = await storage.getPastChallenges(startDate, endDate);
    res.json(challenges);
  });

  app.post("/api/validate", async (req, res) => {
    const storage = await getGeneralStorage();
    const result = validateGuessSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid guess format" });
    }

    const { guess, wordLength } = result.data;
    if (guess.length !== wordLength) {
      return res
        .status(400)
        .json({ error: `Word must be ${wordLength} letters long` });
    }

    const { isValid } = await storage.validateWord(guess);
    const isPredefinedWord = predefinedWords.has(guess.toUpperCase());

    const score = isValid ? calculateWordScore(guess, isPredefinedWord) : 0;

    res.json({ isValid, isPredefinedWord, score });
  });

  app.post("/api/spelling-bee/validate", async (req, res) => {
    const storage = await getGeneralStorage();
    const result = validateSpellingBeeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid word format" });
    }

    const { word } = result.data;
    const { isValid } = await storage.validateWord(word);
    const isPredefinedWord = predefinedWords.has(word.toUpperCase());
    const score = isValid ? calculateWordScore(word, isPredefinedWord) : 0;

    res.json({ isValid, isPredefinedWord, score });
  });

  app.get("/api/word/:word/definition", async (req, res) => {
    const storage = await getGeneralStorage();
    const { word } = req.params;
    const definition = await storage.getWordDefinition(word);
    if (!definition) {
      return res.status(404).json({ error: "Definition not found" });
    }
    res.json({ definition });
  });

  app.get("/api/daily-spelling-bee", async (req, res) => {
    try {
      const assignedGame = await fetchIreadGamePayload(req, "bee-genius");
      const games = buildSpellingBeeHives(assignedGame.words);
      res.json({
        id: Date.parse(assignedGame.date),
        date: assignedGame.date,
        games,
        expiresAt: getExpiresAt(assignedGame.date),
        timerSeconds: assignedGame.timer_seconds,
        timerEnabled: isTimerEnabled(assignedGame.timer_enabled),
        maxHints: assignedGame.max_hints,
        gameType: assignedGame.game_type,
      });
    } catch (error) {
      console.error("Error getting daily spelling bee challenge:", error);
      sendRouteError(res, error, "Failed to fetch daily challenge");
    }
  });

  app.get("/api/spelling-bee/puzzle", async (req, res) => {
    const storage = await requireBookStorage(req);
    if (!storage) {
      return res.status(400).json({ error: "No book ID provided" });
    }

    const length = parseInt(req.query.length as string) || 5;
    try {
      const hive = await storage.generateSpellingBeeHive(length);
      res.json(hive);
    } catch (error) {
      console.error("Error generating spelling bee hive:", error);
      sendRouteError(res, error, "Failed to generate puzzle");
    }
  });

  app.get("/api/daily-spelling-bee/past", async (req, res) => {
    const storage = await getGeneralStorage();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    const challenges = await storage.getPastChallenges(startDate, endDate);
    res.json(challenges);
  });

  app.get("/api/strands/puzzle", async (req, res) => {
    const storage = await requireBookStorage(req);
    if (!storage) {
      return res.status(400).json({ error: "No book ID provided" });
    }

    const size = parseInt(req.query.size as string) || 5;
    try {
      const puzzle = await storage.generateStrandsPuzzle(size);
      res.json(puzzle);
    } catch (error) {
      console.error("Error generating puzzle:", error);
      sendRouteError(res, error, "Failed to generate puzzle");
    }
  });

  app.get("/api/strands/daily", async (req, res) => {
    try {
      const assignedGame = await fetchIreadGamePayload(req, "intellect-link");
      const puzzles = buildStrandsPuzzles(assignedGame.words);
      res.json({
        date: assignedGame.date,
        puzzles,
        expiresAt: getExpiresAt(assignedGame.date),
        timerSeconds: assignedGame.timer_seconds,
        timerEnabled: isTimerEnabled(assignedGame.timer_enabled),
        maxHints: assignedGame.max_hints,
        gameType: assignedGame.game_type,
      });
    } catch (error) {
      console.error("Error getting daily Strands puzzles:", error);
      sendRouteError(res, error, "Failed to get daily puzzles");
    }
  });

  app.post("/api/strands/validate", async (req, res) => {
    const storage = await getGeneralStorage();
    const result = validateStrandsWordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid request format" });
    }

    try {
      const { word } = result.data;
      const { isValid, isSpangram, score } = await storage.validateStrandsWord(
        word
      );

      res.json({
        isValid,
        score,
        isSpangram,
      });
    } catch (error) {
      console.error("Error validating word:", error);
      res.status(500).json({ error: "Failed to validate word" });
    }
  });

  app.get("/api/strands/progress/:userId/:puzzleId", async (req, res) => {
    const storage = await getGeneralStorage();
    const { userId, puzzleId } = req.params;
    try {
      const progress = await storage.getStrandsProgress(userId, puzzleId);
      if (!progress) {
        return res.status(404).json({ error: "Progress not found" });
      }
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to get progress" });
    }
  });

  app.post("/api/strands/progress", async (req, res) => {
    const storage = await getGeneralStorage();
    const result = strandsProgressSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid progress format" });
    }

    try {
      const { userId, puzzleId, ...progress } = result.data;
      await storage.saveStrandsProgress(userId, puzzleId, {
        userId,
        puzzleId,
        ...progress,
        startedAt: new Date(progress.startedAt),
        lastPlayedAt: new Date(progress.lastPlayedAt),
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save progress" });
    }
  });

  app.get("/api/strands/daily/past", async (req, res) => {
    const storage = await getGeneralStorage();
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : subDays(new Date(), 30);
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const challenges = await storage.getPastStrandsChallenges(
        startDate,
        endDate
      );
      res.json(challenges);
    } catch (error) {
      console.error("Error getting past Strands challenges:", error);
      res.status(500).json({ error: "Failed to get past challenges" });
    }
  });

  app.get("/api/word-search", async (req, res) => {
    try {
      const id = normalizeId(req.query.id);
      if (!id) {
        return res.status(400).json({ error: "No book ID provided" });
      }

      const storage = await getBookStorage(id);
      const difficulty = (req.query.difficulty as string) || "medium";
      if (!wordSearchDifficultySchema.safeParse(difficulty).success) {
        return res.status(400).json({ error: "Invalid difficulty level" });
      }

      const ireadWords = await storage.getAllIreadWord();

      const config = {
        easy: { size: 5, wordCount: 6, baseScore: 10, hintPenalty: 0.3 }, // 30% penalty per hint
        medium: { size: 6, wordCount: 9, baseScore: 15, hintPenalty: 0.3 },
        hard: { size: 7, wordCount: 12, baseScore: 20, hintPenalty: 0.3 },
        expert: { size: 8, wordCount: 15, baseScore: 25, hintPenalty: 0.3 },
      } as const;

      // Create empty grid
      const size = config[difficulty as keyof typeof config].size;
      const grid = Array(size)
        .fill(null)
        .map(() => Array(size).fill(""));

      // Filter words that can fit in the grid
      const possibleWords = Array.from(ireadWords)
        .map((word) => word.toUpperCase())
        .filter((word) => word.length <= size)
        .sort(() => Math.random() - 0.5);

      // Try to place words with a mix of directions
      const placedWords: PlacedWord[] = [];
      let horizontalCount = 0;
      let verticalCount = 0;
      let diagonalCount = 0;
      const targetPerDirection = Math.ceil(
        config[difficulty as keyof typeof config].wordCount / 3
      );

      for (const word of possibleWords) {
        if (
          placedWords.length >=
          config[difficulty as keyof typeof config].wordCount
        )
          break;

        // Determine direction based on current counts
        let direction: "horizontal" | "vertical" | "diagonal" | undefined;
        if (
          horizontalCount < targetPerDirection &&
          verticalCount < targetPerDirection &&
          diagonalCount < targetPerDirection
        ) {
          // If all directions are available, rotate between them
          const index = placedWords.length % 3;
          direction =
            index === 0 ? "horizontal" : index === 1 ? "vertical" : "diagonal";
        } else if (horizontalCount < targetPerDirection) {
          direction = "horizontal";
        } else if (verticalCount < targetPerDirection) {
          direction = "vertical";
        } else if (diagonalCount < targetPerDirection) {
          direction = "diagonal";
        }

        const result = placeWord(grid, word, direction);
        if (result.success && result.direction) {
          placedWords.push({ word, direction: result.direction });
          if (direction === "horizontal") horizontalCount++;
          else if (direction === "vertical") verticalCount++;
          else if (direction === "diagonal") diagonalCount++;
        }
      }

      if (placedWords.length === 0) {
        throw new NoWordsAvailableError();
      }

      // Fill remaining empty spaces with random letters
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (grid[y][x] === "") {
            grid[y][x] = String.fromCharCode(
              65 + Math.floor(Math.random() * 26)
            );
          }
        }
      }

      res.json({
        grid,
        words: placedWords.map(({ word, direction }) => ({
          word: word.toUpperCase(),
          direction,
        })),
        difficulty,
        scoring: {
          baseScore: config[difficulty as keyof typeof config].baseScore,
          hintPenalty: config[difficulty as keyof typeof config].hintPenalty,
        },
      });
    } catch (error) {
      console.error("Error generating word search puzzle:", error);
      sendRouteError(res, error, "Failed to generate puzzle");
    }
  });

  app.get("/api/daily-word-search", async (req, res) => {
    try {
      const assignedGame = await fetchIreadGamePayload(req, "word-explorer");
      const { grid, placedWords } = placeAssignedWordsInGrid(assignedGame.words);

      res.json({
        grid,
        words: placedWords.map(({ word, direction }) => ({
          word: word.toUpperCase(),
          direction,
        })),
        date: assignedGame.date,
        difficulty: "expert" as const,
        timerSeconds: assignedGame.timer_seconds,
        timerEnabled: isTimerEnabled(assignedGame.timer_enabled),
        gameType: assignedGame.game_type,
      });
    } catch (error) {
      console.error("Error generating daily word search:", error);
      sendRouteError(res, error, "Failed to generate daily puzzle");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
