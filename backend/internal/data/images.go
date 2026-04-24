package data

import (
	"bytes"
	"fmt"
	"image"

	"github.com/disintegration/imaging"
)

// MaxOriginalEdge caps the long edge of stored originals. 3000px covers
// any realistic hero crop on a 4K display while keeping storage bounded.
const MaxOriginalEdge = 3000

// CompressOriginal decodes the upload, downscales to fit within
// MaxOriginalEdge (aspect preserved), and re-encodes in the detected
// format. On decode error, the caller should fall back to storing the
// raw bytes unchanged.
func CompressOriginal(raw []byte) ([]byte, string, error) {
	img, format, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, "", fmt.Errorf("decode: %w", err)
	}

	b := img.Bounds()
	if b.Dx() > MaxOriginalEdge || b.Dy() > MaxOriginalEdge {
		img = imaging.Fit(img, MaxOriginalEdge, MaxOriginalEdge, imaging.Lanczos)
	}

	var out bytes.Buffer
	ct, err := encode(&out, img, format)
	if err != nil {
		return nil, "", fmt.Errorf("encode: %w", err)
	}
	return out.Bytes(), ct, nil
}
