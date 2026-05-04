package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	photopicker "github.com/samrford/google-photos-picker"
	ppg "github.com/samrford/google-photos-picker/postgres"

	"beyond/backend/internal/data"
	"beyond/backend/internal/email"
	"beyond/backend/internal/handlers"
	"beyond/backend/internal/jobs"
)

// version is set at build time via -ldflags "-X main.version=x.y.z"
var version = "dev"

// corsMiddleware adds CORS headers to all responses
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers FIRST, before any headers are written
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS, POST, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Call the next handler
		next(w, r)
	}
}

// makeImageHandler handles image requests by fetching them from storage.
// Supports ?w=<size> to return a thumbnail fitting within size×size (aspect
// preserved). Allowed sizes: see data.AllowedThumbnailSizes. Without ?w=,
// returns the original bytes as stored.
//
// Access check: the requesting user must either own the file OR the file
// must be referenced by some public resource (trip header, checkpoint
// photo of a public trip, plan cover, or public profile avatar). Returns
// 404 for missing or inaccessible files to avoid leaking which filenames
// exist.
func makeImageHandler(store data.FileStore, db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers FIRST, before any headers are written.
		// Cache-Control is set later, only on successful responses, so
		// errors (404, 401, etc.) aren't cached for a year.
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "GET" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		if store == nil {
			http.Error(w, "Storage not configured", http.StatusInternalServerError)
			return
		}

		filename := strings.TrimPrefix(r.URL.Path, "/v1/image/")
		if filename == "" {
			http.Error(w, "No image specified", http.StatusBadRequest)
			return
		}

		// Access check: owner OR file is referenced by a public resource OR
		// the requester is a collaborator on the private resource that owns
		// the file.
		if db != nil {
			requesterID := handlers.GetUserID(r.Context())
			var allowed bool
			dbErr := db.QueryRowContext(r.Context(), `
				SELECT EXISTS (
					SELECT 1 FROM uploads WHERE key = $1 AND user_id = $2
					UNION ALL
					SELECT 1 FROM trips WHERE is_public AND header_photo = $1
					UNION ALL
					SELECT 1 FROM plans WHERE is_public AND cover_photo = $1
					UNION ALL
					SELECT 1 FROM user_profiles WHERE is_public AND avatar_url = $1
					UNION ALL
					SELECT 1 FROM checkpoints c
					JOIN trips t ON c.trip_id = t.id
					WHERE t.is_public AND (
						c.hero_photo = $1
						OR c.side_photo_1 = $1
						OR c.side_photo_2 = $1
						OR c.side_photo_3 = $1
						OR c.photos @> to_jsonb($1::text)
					)
					UNION ALL
					SELECT 1 FROM trip_collaborators tc
					JOIN trips tt ON tc.trip_id = tt.id
					WHERE tc.user_id = $2 AND tt.header_photo = $1
					UNION ALL
					SELECT 1 FROM trip_collaborators tc
					JOIN checkpoints c ON c.trip_id = tc.trip_id
					WHERE tc.user_id = $2 AND (
						c.hero_photo = $1
						OR c.side_photo_1 = $1
						OR c.side_photo_2 = $1
						OR c.side_photo_3 = $1
						OR c.photos @> to_jsonb($1::text)
					)
					UNION ALL
					SELECT 1 FROM plan_collaborators pc
					JOIN plans pp ON pc.plan_id = pp.id
					WHERE pc.user_id = $2 AND pp.cover_photo = $1
				)
			`, filename, requesterID).Scan(&allowed)
			if dbErr != nil {
				log.Printf("Image access check error for %s: %v", filename, dbErr)
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
			if !allowed {
				http.Error(w, "Image not found", http.StatusNotFound)
				return
			}
		}

		var (
			body        io.ReadCloser
			contentType string
			err         error
		)

		if widthStr := r.URL.Query().Get("w"); widthStr != "" {
			width, perr := strconv.Atoi(widthStr)
			if perr != nil || !data.IsAllowedSize(width) {
				http.Error(w, fmt.Sprintf("Invalid ?w= — allowed sizes: %v", data.AllowedThumbnailSizes), http.StatusBadRequest)
				return
			}
			body, contentType, err = data.GetOrCreateThumbnail(r.Context(), store, filename, width)
		} else {
			body, contentType, err = store.GetFile(r.Context(), filename)
		}

		if err != nil {
			log.Printf("Failed to get image %s: %v", filename, err)
			http.Error(w, "Image not found", http.StatusNotFound)
			return
		}
		defer body.Close()

		if contentType != "" {
			w.Header().Set("Content-Type", contentType)
		} else {
			w.Header().Set("Content-Type", "image/jpeg")
		}
		w.Header().Set("Cache-Control", "public, max-age=31536000")

		io.Copy(w, body)
	}
}

func main() {
	// Read database URL
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://beyond:password@localhost:5432/beyond?sslmode=disable"
	}

	// Initialize database
	db, err := data.InitDB(dbURL)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize storage
	endpoint := os.Getenv("AWS_ENDPOINT_URL_S3")
	if endpoint == "" {
		endpoint = os.Getenv("MINIO_ENDPOINT")
	}

	user := os.Getenv("AWS_ACCESS_KEY_ID")
	if user == "" {
		user = os.Getenv("MINIO_USER")
	}

	password := os.Getenv("AWS_SECRET_ACCESS_KEY")
	if password == "" {
		password = os.Getenv("MINIO_PASSWORD")
	}

	bucket := os.Getenv("BUCKET_NAME")
	if bucket == "" {
		bucket = os.Getenv("S3_BUCKET")
	}
	if bucket == "" {
		bucket = "beyond-travel"
	}

	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = os.Getenv("S3_REGION")
	}

	storage, err := data.InitStorage(
		endpoint,
		user,
		password,
		bucket,
		region,
	)
	if err != nil {
		log.Printf("Warning: Failed to initialize storage: %v", err)
	}

	// Initialize OIDC verifier for Supabase JWT verification
	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		supabaseURL = "https://zzoxjjkljxbaycmubwog.supabase.co"
	}

	verifier, err := handlers.InitAuth(context.Background(), supabaseURL)
	if err != nil {
		log.Fatalf("Failed to initialize OIDC: %v", err)
	}

	// Helper: wrap handler with CORS + Auth middleware
	authed := func(h http.HandlerFunc) http.HandlerFunc {
		return corsMiddleware(handlers.AuthMiddleware(verifier, h))
	}

	// publicGetAuthed allows anonymous GETs (and OPTIONS preflight) but
	// requires authentication for any state-changing method. Inner handlers
	// rely on existing IsPublic / IsOwner checks to filter what anonymous
	// visitors can see.
	publicGetAuthed := func(h http.HandlerFunc) http.HandlerFunc {
		return corsMiddleware(handlers.OptionalAuthMiddleware(verifier, func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodGet && r.Method != http.MethodOptions {
				if handlers.GetUserID(r.Context()) == "" {
					http.Error(w, `{"error":"Authentication required"}`, http.StatusUnauthorized)
					return
				}
			}
			h(w, r)
		}))
	}

	// Create handlers
	tripsHandler := handlers.NewTripsHandler(db)
	checkpointsHandler := handlers.NewCheckpointsHandler(db)
	plansHandler := handlers.NewPlansHandler(db)
	planDaysHandler := handlers.NewPlanDaysHandler(db)
	planItemsHandler := handlers.NewPlanItemsHandler(db)
	profilesHandler := handlers.NewProfilesHandler(db)
	collaboratorsHandler := handlers.NewCollaboratorsHandler(db)
	invitesHandler := handlers.NewInvitesHandler(db)

	// Wire optional email-on-invite path. All three pieces (Resend key,
	// Supabase service role key, frontend origin) must be set or we fall
	// back to a no-op sender so dev environments aren't forced to configure
	// email just to test invites.
	resendKey := os.Getenv("RESEND_API_KEY")
	resendFrom := os.Getenv("RESEND_FROM")
	if resendFrom == "" {
		resendFrom = "Beyond <invites@beyond-travel.net>"
	}
	supabaseServiceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	frontendOrigin := os.Getenv("FRONTEND_ORIGIN")
	if resendKey != "" && supabaseServiceKey != "" && frontendOrigin != "" {
		sender := email.NewResendSender(resendKey, resendFrom)
		admin := data.NewSupabaseAdmin(supabaseURL, supabaseServiceKey)
		invitesHandler.WithEmail(sender, admin, frontendOrigin)
		log.Printf("Invite emails enabled via Resend (from=%q)", resendFrom)
	} else {
		log.Printf("Invite emails disabled (set RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_ORIGIN to enable)")
	}
	var uploader data.FileStore
	if storage != nil {
		uploader = storage
	}
	uploadHandler := handlers.NewUploadHandler(uploader, db)

	// Google Photos integration (optional — only enabled if env vars present)
	var handlersPP *photopicker.Handlers
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	googleRedirectURL := os.Getenv("GOOGLE_REDIRECT_URL")
	googleEncKey := os.Getenv("GOOGLE_TOKEN_ENCRYPTION_KEY")
	if googleClientID != "" && googleClientSecret != "" && googleRedirectURL != "" && googleEncKey != "" && uploader != nil {
		if err := ppg.Migrate(db); err != nil {
			log.Fatalf("photopicker migrate: %v", err)
		}
		tokenStore, err := ppg.NewTokenStore(db, googleEncKey)
		if err != nil {
			log.Fatalf("photopicker token store: %v", err)
		}
		importStore := ppg.NewImportStore(db)
		client, err := photopicker.New(photopicker.Config{
			OAuth:           photopicker.NewOAuthConfig(googleClientID, googleClientSecret, googleRedirectURL),
			TokenStore:      tokenStore,
			ImportStore:     importStore,
			Sink:            handlers.NewBeyondSink(uploader, db),
			MaxDecodedBytes: 500 << 20,
		})
		if err != nil {
			log.Fatalf("photopicker: %v", err)
		}
		handlersPP, err = photopicker.NewHandlers(photopicker.HandlersConfig{
			Client: client,
			ResolveUserID: func(r *http.Request) (string, error) {
				uid := handlers.GetUserID(r.Context())
				if uid == "" {
					return "", errors.New("unauthenticated")
				}
				return uid, nil
			},
			Callback: photopicker.CallbackPage{
				PostMessageType: "beyond:google-oauth",
				TargetOrigin:    os.Getenv("FRONTEND_ORIGIN"),
			},
		})
		if err != nil {
			log.Fatalf("photopicker handlers: %v", err)
		}
		worker, err := photopicker.NewWorker(photopicker.WorkerConfig{Client: client})
		if err != nil {
			log.Fatalf("photopicker worker: %v", err)
		}
		workerCtx, cancelWorker := context.WithCancel(context.Background())
		defer cancelWorker()
		go worker.Run(workerCtx)
		log.Println("Google Photos integration enabled")
	} else {
		log.Println("Google Photos integration disabled (missing env vars)")
	}

	// Launch background orphan cleanup goroutine.
	{
		cleanupCtx, cancelCleanup := context.WithCancel(context.Background())
		defer cancelCleanup()
		if uploader != nil {
			go jobs.RunOrphanCleanup(cleanupCtx, db, uploader)
		}
	}

	// Create server
	mux := http.NewServeMux()

	mux.HandleFunc("/v1/trips", authed(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			tripsHandler.ListTrips(w, r)
		} else if r.Method == "POST" {
			tripsHandler.CreateTrip(w, r)
		}
	}))

	mux.HandleFunc("/v1/trips/", publicGetAuthed(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/v1/trips/")
		if strings.HasSuffix(path, "/checkpoints") {
			if r.Method == "POST" {
				checkpointsHandler.CreateCheckpoint(w, r)
			}
			return
		}

		// /v1/trips/{id}/collaborators[/...]
		if strings.Contains(path, "/collaborators") {
			collaboratorsHandler.HandleTripCollaborators(w, r)
			return
		}
		// /v1/trips/{id}/invites[/...]
		if strings.Contains(path, "/invites") {
			invitesHandler.HandleTripInvites(w, r)
			return
		}

		if r.Method == "GET" {
			tripsHandler.GetTrip(w, r)
		} else if r.Method == "PUT" {
			tripsHandler.UpdateTrip(w, r)
		} else if r.Method == "DELETE" {
			tripsHandler.DeleteTrip(w, r)
		}
	}))

	mux.HandleFunc("/v1/checkpoints/", authed(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "PUT" {
			checkpointsHandler.UpdateCheckpoint(w, r)
		} else if r.Method == "DELETE" {
			checkpointsHandler.DeleteCheckpoint(w, r)
		}
	}))

	mux.HandleFunc("/v1/plans", authed(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			plansHandler.ListPlans(w, r)
		} else if r.Method == "POST" {
			plansHandler.CreatePlan(w, r)
		}
	}))

	mux.HandleFunc("/v1/plans/import", authed(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			plansHandler.ImportPlan(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/v1/plans/", publicGetAuthed(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/v1/plans/")

		if strings.HasPrefix(path, "days/") {
			if r.Method == "DELETE" {
				planDaysHandler.DeletePlanDay(w, r)
			}
			return
		}

		if strings.HasPrefix(path, "items/") {
			if r.Method == "PUT" {
				planItemsHandler.UpdatePlanItem(w, r)
			} else if r.Method == "DELETE" {
				planItemsHandler.DeletePlanItem(w, r)
			}
			return
		}

		if strings.HasSuffix(path, "/days") && r.Method == "POST" {
			planDaysHandler.CreatePlanDay(w, r)
			return
		}

		if strings.HasSuffix(path, "/items") && r.Method == "POST" {
			planItemsHandler.CreatePlanItem(w, r)
			return
		}

		if strings.HasSuffix(path, "/convert") && r.Method == "POST" {
			plansHandler.ConvertPlanToTrip(w, r)
			return
		}

		// /v1/plans/{id}/collaborators[/...]
		if strings.Contains(path, "/collaborators") {
			collaboratorsHandler.HandlePlanCollaborators(w, r)
			return
		}
		// /v1/plans/{id}/invites[/...]
		if strings.Contains(path, "/invites") {
			invitesHandler.HandlePlanInvites(w, r)
			return
		}

		if r.Method == "GET" {
			plansHandler.GetPlan(w, r)
		} else if r.Method == "PUT" {
			plansHandler.UpdatePlan(w, r)
		} else if r.Method == "DELETE" {
			plansHandler.DeletePlan(w, r)
		}
	}))

	// Invite preview is OptionalAuth (anonymous visitors can preview a link
	// before signing up); accept/decline still require auth (enforced inside).
	mux.HandleFunc("/v1/invites/incoming", authed(invitesHandler.ListIncoming))
	mux.HandleFunc("/v1/invites/", corsMiddleware(handlers.OptionalAuthMiddleware(verifier, invitesHandler.HandleByToken)))

	mux.HandleFunc("/v1/profiles/me", authed(profilesHandler.HandleMe))
	mux.HandleFunc("/v1/profiles/check-handle", authed(profilesHandler.CheckHandle))
	mux.HandleFunc("/v1/profiles/", publicGetAuthed(profilesHandler.GetByHandle))
	mux.HandleFunc("/v1/users/search", authed(profilesHandler.Search))

	mux.HandleFunc("/v1/upload", authed(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			uploadHandler.HandleUpload(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/v1/upload/", authed(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "DELETE" {
			uploadHandler.HandleDelete(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	realImageHandler := makeImageHandler(storage, db)
	// Optional auth: signed-in users get owner access to their own images;
	// anonymous visitors can still fetch images referenced by public resources.
	imageMiddleware := corsMiddleware(handlers.OptionalAuthMiddleware(verifier, realImageHandler))
	mux.HandleFunc("/v1/image/", imageMiddleware)
	mux.HandleFunc("/v1/image", imageMiddleware)

	// Google Photos routes — only mounted if the integration is configured.
	if handlersPP != nil {
		mux.HandleFunc("/v1/integrations/google/connect", authed(handlersPP.Connect()))
		mux.HandleFunc("/v1/integrations/google/callback", corsMiddleware(handlersPP.Callback()))
		mux.HandleFunc("/v1/integrations/google/status", authed(handlersPP.Status()))
		mux.HandleFunc("/v1/integrations/google", authed(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodDelete {
				handlersPP.Disconnect()(w, r)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		}))
		mux.HandleFunc("/v1/google-photos/sessions", authed(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodPost {
				handlersPP.CreateSession()(w, r)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		}))
		mux.HandleFunc("/v1/google-photos/sessions/", authed(func(w http.ResponseWriter, r *http.Request) {
			path := strings.TrimPrefix(r.URL.Path, "/v1/google-photos/sessions/")
			sessionID := strings.TrimSuffix(path, "/import")
			extract := func(*http.Request) string { return sessionID }
			switch {
			case strings.HasSuffix(path, "/import") && r.Method == http.MethodPost:
				handlersPP.StartImport(extract)(w, r)
			case r.Method == http.MethodGet:
				handlersPP.PollSession(extract)(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		}))
		mux.HandleFunc("/v1/google-photos/imports/", authed(func(w http.ResponseWriter, r *http.Request) {
			jobID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/v1/google-photos/imports/"), "/")
			handlersPP.GetImport(func(*http.Request) string { return jobID })(w, r)
		}))
	}

	mux.HandleFunc("/v1/version", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"version": version})
	}))

	// Enable CORS for development - catch-all route
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS, POST, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not found"})
	})

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
