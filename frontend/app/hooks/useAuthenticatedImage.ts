"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Module-level blob URL cache keyed by the original request URL.
 * Blob URLs are valid for the lifetime of the browser tab, so we keep them
 * indefinitely rather than revoking on unmount — the same image is often
 * rendered in multiple places and re-fetching would waste bandwidth.
 */
const blobCache = new Map<string, string>();

/** Deduplicates concurrent requests for the same URL. */
const inflight = new Map<string, Promise<string | null>>();

function isApiImage(src: string): boolean {
  return src.includes("/v1/image/");
}

async function fetchAuthImage(url: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;

    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) return null;

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Imperatively fetches an image via the auth pipeline and returns a blob URL.
 * Populates the same cache and deduplication logic used by the hook.
 */
export function preloadAuthImage(
  src: string | null | undefined
): Promise<string | null> {
  if (!src) return Promise.resolve(null);
  if (!isApiImage(src)) return Promise.resolve(src);
  if (blobCache.has(src)) return Promise.resolve(blobCache.get(src)!);

  let promise = inflight.get(src);
  if (!promise) {
    promise = fetchAuthImage(src).then((url) => {
      inflight.delete(src);
      if (url) blobCache.set(src, url);
      return url;
    });
    inflight.set(src, promise);
  }

  return promise;
}

/**
 * Fetches a backend `/v1/image/*` URL with the current user's auth token and
 * returns a blob URL safe to use in `<img src>`.
 *
 * - blob: and external https: URLs are passed through unchanged.
 * - Results are cached for the lifetime of the tab: repeated renders of the
 *   same image (e.g. across list and detail views) reuse the same blob URL
 *   without an extra network request.
 */
export function useAuthenticatedImage(
  src: string | null | undefined
): string | null {
  const initial = (): string | null => {
    if (!src) return null;
    if (!isApiImage(src)) return src;
    return blobCache.get(src) ?? null;
  };

  const [blobUrl, setBlobUrl] = useState<string | null>(initial);

  useEffect(() => {
    // Serve from cache synchronously if possible to avoid mounting layout shifts.
    // The initial state function handles this for the first render, but we also
    // check it here in case src changes during the component's lifetime.
    if (src && isApiImage(src) && blobCache.has(src)) {
      setBlobUrl(blobCache.get(src)!);
      return;
    }

    let alive = true;

    preloadAuthImage(src).then((url) => {
      if (alive) setBlobUrl(url);
    });

    return () => {
      alive = false;
    };
  }, [src]);

  return blobUrl;
}
