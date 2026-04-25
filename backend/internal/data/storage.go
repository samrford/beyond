package data

import (
	"context"
	"fmt"
	"io"
	"log"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type FileStore interface {
	UploadFile(ctx context.Context, filename string, reader io.Reader, size int64, contentType string) (string, error)
	GetFile(ctx context.Context, filename string) (io.ReadCloser, string, error)
	DeleteFile(ctx context.Context, filename string) error
}

type Storage struct {
	client    *s3.Client
	bucket    string
}

func InitStorage(endpoint, user, password, bucket, region string) (*Storage, error) {
	if endpoint == "" {
		return nil, fmt.Errorf("MINIO_ENDPOINT is required")
	}

	if region == "" {
		region = "us-east-1"
	}

	// Ensure endpoint has protocol
	if !strings.HasPrefix(endpoint, "http://") && !strings.HasPrefix(endpoint, "https://") {
		endpoint = "http://" + endpoint
	}

	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, r string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:           endpoint,
			SigningRegion: region,
		}, nil
	})

	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(user, password, "")),
		config.WithEndpointResolverWithOptions(customResolver),
	)
	if err != nil {
		return nil, fmt.Errorf("unable to load AWS config: %v", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	// Safely check if bucket exists or warn the user (especially on Supabase where bucket creation is restricted)
	_, err = client.HeadBucket(context.Background(), &s3.HeadBucketInput{
		Bucket: aws.String(bucket),
	})
	if err != nil {
		log.Printf("S3 Bucket Warning: %v. (If using Supabase, ensure the bucket exists in their dashboard)", err)
		// We can still try to create it, but don't crash if restricted
		_, _ = client.CreateBucket(context.Background(), &s3.CreateBucketInput{
			Bucket: aws.String(bucket),
		})
	} else {
		log.Printf("Bucket %s found", bucket)
	}

	return &Storage{
		client:    client,
		bucket:    bucket,
	}, nil
}

func (s *Storage) UploadFile(ctx context.Context, filename string, reader io.Reader, size int64, contentType string) (string, error) {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(filename),
		Body:        reader,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", err
	}

	// Store only the bare filename — callers build the image URL (e.g.
	// /v1/image/{filename}) at read time.
	return filename, nil
}

func (s *Storage) GetFile(ctx context.Context, filename string) (io.ReadCloser, string, error) {
	result, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(filename),
	})
	if err != nil {
		return nil, "", err
	}

	var contentType string
	if result.ContentType != nil {
		contentType = *result.ContentType
	}

	return result.Body, contentType, nil
}

func (s *Storage) DeleteFile(ctx context.Context, filename string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(filename),
	})
	return err
}
