package email

import (
	"context"
	"fmt"

	"github.com/resend/resend-go/v2"
)

// ResendSender sends transactional email via Resend.
type ResendSender struct {
	client *resend.Client
	from   string // e.g. `"Beyond <invites@beyond-travel.net>"`
}

func NewResendSender(apiKey, from string) *ResendSender {
	return &ResendSender{
		client: resend.NewClient(apiKey),
		from:   from,
	}
}

func (s *ResendSender) SendInviteEmail(ctx context.Context, d InviteEmailData) error {
	html, text, err := renderInviteEmail(d)
	if err != nil {
		return fmt.Errorf("render invite email: %w", err)
	}

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{d.RecipientEmail},
		Subject: inviteSubject(d),
		Html:    html,
		Text:    text,
		Tags: []resend.Tag{
			{Name: "kind", Value: "invite"},
			{Name: "resource", Value: d.ResourceKind},
		},
	}

	_, err = s.client.Emails.SendWithContext(ctx, params)
	if err != nil {
		return fmt.Errorf("resend send: %w", err)
	}
	return nil
}
