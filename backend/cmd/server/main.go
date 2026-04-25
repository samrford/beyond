package main

import (
	"context"
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
	"beyond/backend/internal/handlers"
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
func makeImageHandler(store data.FileStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers FIRST, before any headers are written
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Cache-Control", "public, max-age=31536000") // Cache images for a year

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

	// Create handlers
	tripsHandler := handlers.NewTripsHandler(db)
	checkpointsHandler := handlers.NewCheckpointsHandler(db)
	plansHandler := handlers.NewPlansHandler(db)
	planDaysHandler := handlers.NewPlanDaysHandler(db)
	planItemsHandler := handlers.NewPlanItemsHandler(db)
	var uploader data.FileStore
	if storage != nil {
		uploader = storage
	}
	uploadHandler := handlers.NewUploadHandler(uploader)

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
			Sink:            handlers.NewBeyondSink(uploader),
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

	// Create server
	mux := http.NewServeMux()

	mux.HandleFunc("/v1/trips", authed(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			tripsHandler.ListTrips(w, r)
		} else if r.Method == "POST" {
			tripsHandler.CreateTrip(w, r)
		}
	}))

	mux.HandleFunc("/v1/trips/", authed(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/v1/trips/")
		if strings.HasSuffix(path, "/checkpoints") {
			if r.Method == "POST" {
				checkpointsHandler.CreateCheckpoint(w, r)
			}
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

	mux.HandleFunc("/v1/plans/", authed(func(w http.ResponseWriter, r *http.Request) {
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

		if r.Method == "GET" {
			plansHandler.GetPlan(w, r)
		} else if r.Method == "PUT" {
			plansHandler.UpdatePlan(w, r)
		} else if r.Method == "DELETE" {
			plansHandler.DeletePlan(w, r)
		}
	}))

	mux.HandleFunc("/v1/upload", authed(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			uploadHandler.HandleUpload(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	realImageHandler := makeImageHandler(storage)
	mux.HandleFunc("/v1/image/", realImageHandler)
	mux.HandleFunc("/v1/image", realImageHandler)

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
