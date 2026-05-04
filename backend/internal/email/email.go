// Package email provides transactional email sending for Beyond.
package email

import "context"

// InviteEmailData is the payload required to render and send an invite email.
type InviteEmailData struct {
	RecipientEmail   string
	RecipientName    string // display name; may be empty
	InviterName      string // display name (or handle if no display name)
	InviterHandle    string
	ResourceKind     string // "trip" or "plan"
	ResourceName     string
	Role             string // "viewer" or "contributor"
	InviteURL        string // full URL to /invite/{token}
}

// Sender abstracts the underlying email provider so the handler layer can
// stay provider-agnostic and tests can substitute a stub.
type Sender interface {
	SendInviteEmail(ctx context.Context, d InviteEmailData) error
}

// NoopSender is used when no email provider is configured. All sends are
// silently dropped — handlers should still log when they hand off to it so
// it's obvious in dev that emails aren't actually going out.
type NoopSender struct{}

func (NoopSender) SendInviteEmail(_ context.Context, _ InviteEmailData) error {
	return nil
}
