import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function getResponseErrorMessage(res: Response) {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => null);
    if (data && typeof data.error === "string") {
      return data.error;
    }
    if (data && typeof data.message === "string") {
      return data.message;
    }
  }

  return (await res.text()) || res.statusText || "Request failed";
}

export async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    throw new Error(await getResponseErrorMessage(res));
  }
}

export async function fetchJsonOrThrow<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  await throwIfResNotOk(res);
  return res.json();
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
