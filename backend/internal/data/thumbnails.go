package data

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"io"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
)

// AllowedThumbnailSizes lists the sizes we accept on ?w=. Requests outside this
// set are rejected to avoid cache sprawl and bound CPU cost.
var AllowedThumbnailSizes = []int{400, 800, 1600, 2400}

// IsAllowedSize reports whether the given box size is in the allowlist.
func IsAllowedSize(size int) bool {
	for _, s := range AllowedThumbnailSizes {
		if s == size {
			return true
		}
	}
	return false
}

// ThumbnailKey returns the MinIO object key for a cached thumbnail.
// e.g. ("abcd-1234.jpg", 800) -> "abcd-1234@w800.jpg"
func ThumbnailKey(original string, size int) string {
	ext := filepath.Ext(original)
	base := strings.TrimSuffix(original, ext)
	if ext == "" {
		ext = ".jpg"
	}
	return fmt.Sprintf("%s@w%d%s", base, size, ext)
}

// GetOrCreateThumbnail returns a thumbnail fitting within size×size (aspect
// preserved). It checks MinIO for a cached version first; on miss it fetches
// the original, resizes, caches, and returns the fresh bytes.
//
// Returns (body, contentType, err). Caller must close body.
func GetOrCreateThumbnail(ctx context.Context, store FileStore, original string, size int) (io.ReadCloser, string, error) {
	if !IsAllowedSize(size) {
		return nil, "", fmt.Errorf("size %d not in allowlist", size)
	}

	cacheKey := ThumbnailKey(original, size)

	// Cache hit?
	if body, ct, err := store.GetFile(ctx, cacheKey); err == nil {
		return body, ct, nil
	}

	// Fetch original.
	origBody, origCT, err := store.GetFile(ctx, original)
	if err != nil {
		return nil, "", fmt.Errorf("fetch original: %w", err)
	}
	defer origBody.Close()

	origBytes, err := io.ReadAll(origBody)
	if err != nil {
		return nil, "", fmt.Errorf("read original: %w", err)
	}

	var resized []byte
	var outCT string
	var tooSmall bool

	if err := withDecodeSlot(ctx, func() error {
		img, format, err := image.Decode(bytes.NewReader(origBytes))
		if err != nil {
			return fmt.Errorf("decode: %w", err)
		}

		// If the image is already smaller than the target box, serve the original
		// without caching — avoids storing duplicate bytes under the thumbnail key.
		b := img.Bounds()
		if b.Dx() <= size && b.Dy() <= size {
			tooSmall = true
			return nil
		}

		fitted := imaging.Fit(img, size, size, imaging.Lanczos)

		var out bytes.Buffer
		outCT, err = encode(&out, fitted, format)
		if err != nil {
			return fmt.Errorf("encode: %w", err)
		}
		resized = out.Bytes()
		return nil
	}); err != nil {
		return nil, "", err
	}

	if tooSmall {
		return io.NopCloser(bytes.NewReader(origBytes)), origCT, nil
	}

	if _, err := store.UploadFile(ctx, cacheKey, bytes.NewReader(resized), int64(len(resized)), outCT); err != nil {
		return nil, "", fmt.Errorf("cache: %w", err)
	}

	return io.NopCloser(bytes.NewReader(resized)), outCT, nil
}

// encode writes img to w in a sensible format based on the source's detected
// format, returning the Content-Type to use.
func encode(w io.Writer, img image.Image, format string) (string, error) {
	switch strings.ToLower(format) {
	case "png":
		return "image/png", imaging.Encode(w, img, imaging.PNG)
	case "gif":
		return "image/gif", imaging.Encode(w, img, imaging.GIF)
	default:
		return "image/jpeg", imaging.Encode(w, img, imaging.JPEG, imaging.JPEGQuality(85))
	}
}
