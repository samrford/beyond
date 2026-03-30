package handlers

import (
	"net/http"
)

// ImageHandler handles image requests
type ImageHandler struct {
	imageData   []byte
	contentType string
}

// NewImageHandler creates a new ImageHandler
func NewImageHandler(imageData []byte) *ImageHandler {
	return &ImageHandler{
		imageData:   imageData,
		contentType: "image/jpeg",
	}
}

// ServeImage handles GET /api/image
func (h *ImageHandler) ServeImage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", h.contentType)
	w.Write(h.imageData)
}
