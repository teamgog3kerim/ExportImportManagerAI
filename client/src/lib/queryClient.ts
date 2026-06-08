import { QueryClient, QueryFunction } from "@tanstack/react-query";

const PUBLIC_PATHS = ["/", "/signin", "/signup"];

// Centralized handling for any API call that comes back 401 (session expired,
// account blocked/deleted, etc.). Clears cached auth/data and forces the user
// back to the sign-in screen on their next request.
function handleUnauthorized() {
  queryClient.setQueryData(["/api/auth/me"], null);
  queryClient.clear();
  if (typeof window !== "undefined" && !PUBLIC_PATHS.includes(window.location.pathname)) {
    window.location.href = "/signin";
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401) {
    handleUnauthorized();
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (res.status === 401) {
      // returnNull is used by the auth probe itself (useAuth) — don't redirect
      // there, just report "not signed in". For any other query, a 401 means
      // the session is gone, so force a clean redirect to sign-in.
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      handleUnauthorized();
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
