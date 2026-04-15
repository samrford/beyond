# Use the official Golang image to build the binary
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Enable CGO off for static binary
ENV CGO_ENABLED=0
ENV GOOS=linux

# Install dependencies first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application
COPY . .

# Build the main server
ARG APP_VERSION=dev
RUN go build -ldflags="-w -s -X main.version=${APP_VERSION}" -o server ./cmd/server

# Use a minimal alpine image for the final container
FROM alpine:3.19

WORKDIR /root/
RUN apk --no-cache add ca-certificates

# Copy the binary from builder
COPY --from=builder /app/server .

# Expose port and start
EXPOSE 8080
CMD ["./server"]
