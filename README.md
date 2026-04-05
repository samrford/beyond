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

## 🔐 Authentication (Supabase)

The backend uses **Supabase** for secure authentication. 

- **JWT Verification**: The backend dynamically fetches Supabase's Public Keys (JWKS) via OIDC discovery.
- **Required Header**: All protected endpoints require a `Bearer` token in the `Authorization` header.
  - `Authorization: Bearer <your-supabase-jwt>`
- **User Scoping**: The `sub` claim (User ID) from the JWT is used to scope all database queries, ensuring users only access their own data.

---

## 🔌 API Endpoints

### 🗺 Trips (Legacy/Simple)
- `GET    /api/trips` - List all user trips
- `POST   /api/trips` - Create a new trip
- `GET    /api/trips/{id}` - Get a specific trip and its checkpoints
- `PUT    /api/trips/{id}` - Update a specific trip
- `DELETE /api/trips/{id}` - Delete a specific trip
- `POST   /api/trips/{id}/checkpoints` - Add a checkpoint to a trip

### 📍 Checkpoints
- `PUT    /api/checkpoints/{id}` - Update a checkpoint
- `DELETE /api/checkpoints/{id}` - Delete a checkpoint

### 📝 Plans
- `GET    /api/plans` - List all user planning sessions
- `POST   /api/plans` - Create a new planning session
- `GET    /api/plans/{id}` - Get plan details (including days and items)
- `PUT    /api/plans/{id}` - Update plan metadata
- `DELETE /api/plans/{id}` - Delete a plan
- `POST   /api/plans/{id}/days` - Add a new day to a plan
- `DELETE /api/plans/days/{id}` - Remove a day from a plan
- `POST   /api/plans/{id}/items` - Add an item (activity/flight/etc) to a plan day
- `PUT    /api/plans/items/{id}` - Update a plan item
- `DELETE /api/plans/items/{id}` - Remove a plan item
- `POST   /api/plans/{id}/convert` - **Finalize!** Convert a plan into a real Trip

### ☁️ Storage & Helpers
- `POST   /api/upload` - Upload an image (Multipart Form, returns S3/MinIO URL)
- `GET    /api/image/{id}` - Placeholder SVG generator (Public)

---

## ⚙️ Environment Variables

The backend requires the following variables (provided by Tilt in dev):
- `DATABASE_URL`: Connection string for PostgreSQL.
- `SUPABASE_URL`: Your Supabase Project URL (for OIDC discovery).
- `MINIO_ENDPOINT`: MinIO server for file storage.
- `MINIO_USER` / `MINIO_PASSWORD`: MinIO credentials.
- `MINIO_PUBLIC_URL`: Public-facing URL for serving uploaded images.
