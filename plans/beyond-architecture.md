# Beyond Travel - Architecture Documentation

## Current State

### Backend (Go)
- ✅ Hardcoded trip data in `backend/internal/data/trips.go`
- ✅ CORS middleware configured
- ✅ Image handler serving SVG placeholders inline in `backend/cmd/server/main.go`
- ✅ Trip API endpoints: `/api/trips` (list), `/api/trips/{id}` (get)
- ✅ Image API endpoint: `/api/image` (serves placeholder images)

### Frontend (Next.js)
- ✅ Trip listing page at `/trips`
- ✅ Trip detail page at `/trip/[id]`
- ✅ Image routing through backend `/api/image` endpoint
- ✅ Tailwind CSS configured

### Image Serving Strategy

The Go backend currently serves images using an **inline SVG placeholder** directly in the code. This approach:

1. **No external dependencies** - Images are embedded in the Go source code
2. **Simple and reliable** - No file system dependencies
3. **CORS-enabled** - All images are served with proper CORS headers
4. **Easy to customize** - Can be replaced with real images if needed

### How Images Are Served

```go
// In backend/cmd/server/main.go
func imageHandler(w http.ResponseWriter, r *http.Request) {
    // Simple SVG placeholder
    imageData := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f0f0f0"/>
  <text x="400" y="300" font-family="Arial" font-size="48" text-anchor="middle" fill="#666">Beyond Travel</text>
</svg>`)

    w.Header().Set("Content-Type", "image/svg+xml")
    w.Write(imageData)
}
```

### To Test the Full Flow

1. Start the backend:
   ```bash
   cd backend
   go run cmd/server/main.go
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Visit `http://localhost:3000/trips` to see the trip listing
4. Click on a trip to see the detail page with images

### Alternative: Serving Real Images

If you want to serve actual images instead of SVG placeholders, update the `imageHandler` function:

```go
func imageHandler(w http.ResponseWriter, r *http.Request) {
    // Option 1: Serve from file system
    imageData, _ := os.ReadFile("public/image.jpg")
    w.Header().Set("Content-Type", "image/jpeg")
    w.Write(imageData)

    // Option 2: Use a static file handler
    // http.FileServer(http.Dir("public"))
}
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/trips` | GET | List all trips |
| `/api/trips/{id}` | GET | Get a specific trip |
| `/api/image` | GET | Serve placeholder images |

### Next Steps

1. ✅ Test the full flow locally
2. ⏳ Update README with setup instructions
3. ⏳ Optionally add real images to the public folder
4. ⏳ Consider adding image upload functionality
