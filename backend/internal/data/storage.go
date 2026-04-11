package data

import (
	"context"
	"fmt"
	"io"
	"log"
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

func InitStorage(endpoint, user, password, bucket, publicURL string) (*Storage, error) {
	if endpoint == "" {
		return nil, fmt.Errorf("MINIO_ENDPOINT is required")
	}

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(user, password, ""),
		Secure: false, // Set to true if using TLS
	})
	if err != nil {
		return nil, err
	}

	// Ensure bucket exists with retry
	var exists bool
	for i := 0; i < 5; i++ {
		exists, err = client.BucketExists(context.Background(), bucket)
		if err == nil {
			break
		}
		log.Printf("MinIO Connection Error (attempt %d/5): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to MinIO after retries: %v", err)
	}

	log.Printf("Successfully connected to MinIO. Checking bucket: %s", bucket)
	if !exists {
		log.Printf("Bucket %s does not exist, creating it...", bucket)
		err = client.MakeBucket(context.Background(), bucket, minio.MakeBucketOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create bucket: %v", err)
		}

		// Set public read policy
		policy := fmt.Sprintf(`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetBucketLocation","s3:ListBucket"],"Resource":["arn:aws:s3:::%s"]},{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}`, bucket, bucket)
		err = client.SetBucketPolicy(context.Background(), bucket, policy)
		if err != nil {
			log.Printf("Warning: Failed to set bucket policy: %v", err)
		}
		log.Printf("Bucket %s created and configured", bucket)
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
