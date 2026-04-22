/**
 * Centralised API client.
 */

import { createClient } from "@/lib/supabase/client";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

/**
 * Get the current Supabase access token, if available.
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Build auth headers if a session exists.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * Typed fetch wrapper that auto-prepends the API base URL,
 * throws on non-OK responses, and parses JSON.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const auth = await authHeaders();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...auth,
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new ApiError(response.status, errorText, path);
  }

  // Handle 204 No Content (e.g. DELETE responses)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Upload a file via multipart form — doesn't set Content-Type header
 * (browser sets it with the boundary automatically).
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const auth = await authHeaders();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      ...auth,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(response.status, "Upload failed", path);
  }

  return response.json();
}

/**
 * Allowed thumbnail sizes (must match backend data.AllowedThumbnailSizes).
 * Requesting a size outside this list will 400.
 */
export type ThumbnailWidth = 400 | 800 | 1600 | 2400;

/**
 * Centralised image URL resolver.
 * Handles empty paths (placeholder), absolute URLs, and relative paths.
 *
 * Pass `w` to request a server-side thumbnail (aspect preserved, fit within
 * w×w). Originals stay untouched in storage — this only affects delivery.
 * External URLs (blob:, https://) are returned as-is regardless of `w`.
 */
export function getImageUrl(
  photoPath: string | undefined | null,
  w?: ThumbnailWidth
): string {
  if (!photoPath) return `${API_BASE_URL}/api/image/placeholder`;
  if (photoPath.startsWith("http") || photoPath.startsWith("blob:"))
    return photoPath;
  const query = w ? `?w=${w}` : "";
  if (photoPath.startsWith("/api/image"))
    return `${API_BASE_URL}${photoPath}${query}`;
  return `${API_BASE_URL}/api/image/${photoPath}${query}`;
}

/**
 * Custom error class for API failures, capturing status and endpoint.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public endpoint: string
  ) {
    super(`API ${status} on ${endpoint}: ${body}`);
    this.name = "ApiError";
  }
}
