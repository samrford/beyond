# Beyond Travel

A full-stack travel application with a Go backend and Next.js frontend, orchestrated with Tilt and backed by PostgreSQL.

---

## 🚀 Rapid Development

The easiest way to run the entire stack is using **Tilt**.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Tilt](https://tilt.dev/)
- Go 1.21+ (for local builds)
- Node.js 18+ (for local frontend installs)

### Startup
Simply run:
```bash
tilt up
```
This will:
1. Spin up a **PostgreSQL 15** container.
2. Build and start the **Go Backend** (port 8080).
3. Install and start the **Next.js Frontend** (port 3000).
4. Automatically run **Goose migrations** to set up the database schema.

---

## 🏗 Project Structure

```text
beyond/
├── backend/                 # Go backend API
│   ├── cmd/server/         # Entry point (main.go)
│   ├── internal/
│   │   ├── data/           # DB logic & migrations (Goose)
│   │   ├── handlers/       # API endpoints
│   │   └── middleware/     # Shared logic (CORS)
├── frontend/               # Next.js Application
├── docker-compose.yml       # Infrastructure (Postgres)
└── Tiltfile                 # Dev orchestration
```

---

---

## 💾 Database Management

We use **PostgreSQL** for storage. Migrations in `backend/internal/data/migrations` run automatically via **Goose** on startup.

**Quick Commands:**
- **Explore DB:** `docker exec -it beyond-db-1 psql -U beyond -d beyond` (or connect your local tools directly to `postgres://beyond:password@localhost:5432/beyond`)
- **Reset DB:** `docker-compose down -v` to wipe the database volume.

---

---

## 🔌 API Endpoints
- `GET    /api/trips` - List all trips
- `POST   /api/trips` - Create a new trip
- `GET    /api/trips/{id}` - Get a specific trip and its checkpoints
- `PUT    /api/trips/{id}` - Update a specific trip
- `DELETE /api/trips/{id}` - Delete a specific trip
- `POST   /api/trips/{id}/checkpoints` - Add a checkpoint to a trip
- `PUT    /api/checkpoints/{id}` - Update a checkpoint
- `DELETE /api/checkpoints/{id}` - Delete a checkpoint
- `GET    /api/image/{id}` - Generate placeholder SVG images (temp dev helper)
