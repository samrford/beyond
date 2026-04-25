package data

import (
	"context"
	"log"
	"os"
	"strconv"
)

// decodeSlots is a semaphore that caps concurrent image decodes.
// Sized by MAX_DECODE_CONCURRENCY (default 1).
// This is required to prevent the server from running out of memory when decoding images.
var decodeSlots chan struct{}

func init() {
	n := 1
	if s := os.Getenv("MAX_DECODE_CONCURRENCY"); s != "" {
		v, err := strconv.Atoi(s)
		if err != nil || v < 1 {
			log.Printf("data: invalid MAX_DECODE_CONCURRENCY %q, using default %d", s, n)
		} else {
			n = v
		}
	}
	decodeSlots = make(chan struct{}, n)
}

// withDecodeSlot acquires the global decode semaphore, calls fn, then releases.
// Respects context cancellation while waiting for a slot.
func withDecodeSlot(ctx context.Context, fn func() error) error {
	select {
	case decodeSlots <- struct{}{}:
	case <-ctx.Done():
		return ctx.Err()
	}
	defer func() { <-decodeSlots }()
	return fn()
}
