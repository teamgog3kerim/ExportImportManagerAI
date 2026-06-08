import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "./queryClient";
import { PAGES, type PermLevel } from "@shared/permissions";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  permissions: Record<string, PermLevel>;
  createdAt: string;
}

export function useAuth() {
  const query = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 60_000,
    retry: false,
  });
  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
  };
}

export function levelFor(user: AuthUser | null, pageKey: string): PermLevel {
  if (!user) return "none";
  if (user.role === "admin") return "record";
  const page = PAGES.find((p) => p.key === pageKey);
  if (page?.adminOnly) return "none";
  return (user.permissions?.[pageKey] as PermLevel) ?? "none";
}

export function canView(user: AuthUser | null, pageKey: string): boolean {
  return levelFor(user, pageKey) !== "none";
}

export function canRecord(user: AuthUser | null, pageKey: string): boolean {
  return levelFor(user, pageKey) === "record";
}

export function visiblePages(user: AuthUser | null) {
  return PAGES.filter((p) => canView(user, p.key));
}
