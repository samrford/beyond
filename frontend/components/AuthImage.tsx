"use client";

import { useAuthenticatedImage } from "@/app/hooks/useAuthenticatedImage";

interface AuthImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined;
  alt: string;
  /**
   * Mirrors Next.js `<Image fill>` — positions the element absolutely so it
   * covers its nearest `position: relative` ancestor, same as object-cover
   * with fill. The parent must be `position: relative` with a defined size.
   */
  fill?: boolean;
}

/**
 * Drop-in replacement for `<Image>` / `<img>` when rendering images from the
 * backend's `/v1/image/*` endpoint.
 *
 * Internally uses `useAuthenticatedImage` to fetch the image with the current
 * user's Bearer token and render the result as a blob URL, so the browser
 * never issues an unauthenticated request to the authed image endpoint.
 *
 * blob: preview URLs (from `URL.createObjectURL`) and external https: URLs
 * are passed through unchanged and rendered immediately without a fetch.
 *
 * While the blob URL is being resolved a transparent placeholder `<div>` with
 * the same sizing is rendered so the surrounding layout does not shift.
 */
export default function AuthImage({
  src,
  alt,
  fill = false,
  className = "",
  style,
  ...rest
}: AuthImageProps) {
  const blobUrl = useAuthenticatedImage(src);

  const fillStyle: React.CSSProperties = fill
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        ...style,
      }
    : { ...style };

  if (!blobUrl) {
    return <div className={className} style={fillStyle} aria-hidden />;
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      style={fillStyle}
      {...rest}
    />
  );
}
