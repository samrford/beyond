/**
 * Centralised API client.
 */

import { createClient } from "@/lib/supabase/client";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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
 * Fire-and-forget DELETE helper. Resolves when the request completes
 * (any status). Does not throw — intended for best-effort cleanup calls
 * (e.g. deleting orphaned uploads on modal cancel).
 */
export async function apiDelete(path: string): Promise<void> {
  try {
    const auth = await authHeaders();
    await fetch(`${API_BASE_URL}${path}`, {
      method: "DELETE",
      headers: { ...auth },
    });
  } catch {
    // Intentionally swallow — the cron sweep is the safety net.
  }
}

/**
 * Allowed thumbnail sizes (must match backend data.AllowedThumbnailSizes).
 * Requesting a size outside this list will 400.
 */
export type ThumbnailWidth = 400 | 800 | 1600 | 2400;

/**
 * Centralised image URL resolver.
 *
 * The DB stores bare filenames — we build the `/v1/image/{filename}` URL here.
 * External URLs (blob:, https://) pass through untouched. Pass `w` to request
 * a server-side thumbnail (aspect preserved, fit within w×w).
 */
export function getImageUrl(
  photoPath: string | undefined | null,
  w?: ThumbnailWidth
): string {
  const query = w ? `?w=${w}` : "";
  if (!photoPath) return `${API_BASE_URL}/v1/image/placeholder${query}`;
  if (photoPath.startsWith("http") || photoPath.startsWith("blob:"))
    return photoPath;
  return `${API_BASE_URL}/v1/image/${photoPath}${query}`;
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
