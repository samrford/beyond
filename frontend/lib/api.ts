/**
 * Centralised API client.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

/**
 * Typed fetch wrapper that auto-prepends the API base URL,
 * throws on non-OK responses, and parses JSON.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(response.status, "Upload failed", path);
  }

  return response.json();
}

/**
 * Centralised image URL resolver.
 * Handles empty paths (placeholder), absolute URLs, and relative paths.
 */
export function getImageUrl(photoPath: string | undefined | null): string {
  if (!photoPath) return `${API_BASE_URL}/api/image/placeholder`;
  if (photoPath.startsWith("http") || photoPath.startsWith("blob:"))
    return photoPath;
  if (photoPath.startsWith("/api/image"))
    return `${API_BASE_URL}${photoPath}`;
  return `${API_BASE_URL}/api/image/${photoPath}`;
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
