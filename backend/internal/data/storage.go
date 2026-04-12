package data

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type FileUploader interface {
	UploadFile(ctx context.Context, filename string, reader io.Reader, size int64, contentType string) (string, error)
}

type Storage struct {
	client    *minio.Client
	bucket    string
	publicURL string
}

type pathAppenderTransport struct {
	base http.RoundTripper
	path string
}

func (t *pathAppenderTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Prepend the custom path (e.g. /storage/v1/s3)
	req.URL.Path = t.path + req.URL.Path
	return t.base.RoundTrip(req)
}

func InitStorage(endpoint, user, password, bucket, publicURL string) (*Storage, error) {
	if endpoint == "" {
		return nil, fmt.Errorf("MINIO_ENDPOINT is required")
	}

	var minioHost string
	var useSSL bool
	var basePath string

	if strings.HasPrefix(endpoint, "http://") || strings.HasPrefix(endpoint, "https://") {
		u, err := url.Parse(endpoint)
		if err != nil {
			return nil, fmt.Errorf("invalid MINIO_ENDPOINT: %v", err)
		}
		minioHost = u.Host
		useSSL = u.Scheme == "https"
		basePath = strings.TrimSuffix(u.Path, "/")
	} else {
		minioHost = endpoint
		useSSL = false // Local dev
	}

	opts := &minio.Options{
		Creds:  credentials.NewStaticV4(user, password, ""),
		Secure: useSSL,
	}

	if basePath != "" {
		opts.Transport = &pathAppenderTransport{
			base: http.DefaultTransport,
			path: basePath,
		}
	}

	client, err := minio.New(minioHost, opts)
	if err != nil {
		return nil, err
	}

	// For Supabase, the bucket generally already exists because it's managed in their dashboard,
	// but we'll try to ensure it exists anyway, suppressing errors.
	exists, err := client.BucketExists(context.Background(), bucket)
	if err != nil {
		log.Printf("MinIO Connection or Bucket warning: %v. (If using Supabase, ensure the bucket exists in their dashboard)", err)
	} else if !exists {
		log.Printf("Bucket %s does not exist, creating it...", bucket)
		err = client.MakeBucket(context.Background(), bucket, minio.MakeBucketOptions{})
		if err != nil {
			log.Printf("Warning: failed to create bucket: %v. Suppressing error to allow Supabase to handle it.", err)
		} else {
			// Set public read policy
			policy := fmt.Sprintf(`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetBucketLocation","s3:ListBucket"],"Resource":["arn:aws:s3:::%s"]},{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}`, bucket, bucket)
			client.SetBucketPolicy(context.Background(), bucket, policy)
		}
	} else {
		log.Printf("Bucket %s already exists", bucket)
	}

	return &Storage{
		client:    client,
		bucket:    bucket,
		publicURL: publicURL,
	}, nil
}

func (s *Storage) UploadFile(ctx context.Context, filename string, reader io.Reader, size int64, contentType string) (string, error) {
	_, err := s.client.PutObject(ctx, s.bucket, filename, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", err
	}

	if s.publicURL != "" {
		return fmt.Sprintf("%s/%s/%s", s.publicURL, s.bucket, filename), nil
	}

	return filename, nil
}
