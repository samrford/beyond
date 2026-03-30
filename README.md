# Beyond Travel

A full-stack travel application with a Go backend and Next.js frontend.

## Project Structure

```
beyond/
├── backend/                 # Go backend API
│   ├── cmd/server/         # Server entry point
│   ├── internal/
│   │   ├── data/           # Hardcoded trip data
│   │   ├── handlers/       # API handlers
│   │   └── middleware/     # CORS middleware
│   └── go.mod
├── frontend/               # Next.js frontend
│   ├── app/               # Next.js app router
│   ├── components/        # React components
│   └── public/            # Static assets
├── shared/                # Shared TypeScript types
├── plans/                 # Architecture documentation
└── scripts/               # Utility scripts
```

## Getting Started

### Prerequisites

- Go 1.21+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Build and run the server:
   ```bash
   go run cmd/server/main.go
   ```

3. The server will start on `http://localhost:8080`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. The frontend will be available at `http://localhost:3000`

## API Endpoints

### Trips API

- `GET /api/trips` - List all trips
- `GET /api/trips/{id}` - Get a specific trip by ID

### Image API

- `GET /api/image` - Serve placeholder images

## Features

- **Hardcoded Trip Data**: Sample European trip data with multiple checkpoints
- **CORS Enabled**: Backend supports cross-origin requests from the frontend
- **Image Serving**: Backend serves placeholder images for all photo requests
- **Responsive Design**: Tailwind CSS for responsive layouts
- **Timeline View**: Trip checkpoints displayed in a timeline format

## Architecture

### Backend (Go)

The Go backend provides a REST API with:
- Hardcoded trip data loaded at startup
- CORS middleware for cross-origin requests
- Inline image handler serving SVG placeholders
- Simple, dependency-free architecture

### Frontend (Next.js)

The Next.js frontend provides:
- Trip listing page at `/trips`
- Trip detail pages at `/trip/[id]`
- Image routing through the backend API
- Tailwind CSS for styling

### Image Strategy

Images are served directly from the Go backend using inline SVG placeholders. This approach:
- Requires no external dependencies
- Is simple and reliable
- Can be easily replaced with real images if needed

## Development

### Running Both Servers

Terminal 1 (Backend):
```bash
cd backend
go run cmd/server/main.go
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### Testing the Full Flow

1. Start the backend on port 8080
2. Start the frontend on port 3000
3. Visit `http://localhost:3000/trips`
4. Click on a trip to see the detail page with images

## License

MIT
