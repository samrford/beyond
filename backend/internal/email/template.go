package email

import (
	"bytes"
	"fmt"
	"html/template"
	"strings"
)

func inviteSubject(d InviteEmailData) string {
	name := d.InviterName
	if name == "" {
		name = "@" + d.InviterHandle
	}
	return fmt.Sprintf(`%s invited you to "%s" on Beyond`, name, d.ResourceName)
}

type inviteTmplData struct {
	Greeting     string // "Hi Sam" or "Hi there"
	InviterName  string
	InviterAt    string // "@handle" or empty
	ResourceKind string // "trip" or "plan"
	ResourceName string
	RoleLine     string // "as a contributor — you'll be able to edit and add things"
	CTALabel     string // "Open invite"
	InviteURL    string
	PreviewText  string // hidden preheader shown by some clients
}

func buildTmplData(d InviteEmailData) inviteTmplData {
	greeting := "Hi there"
	if d.RecipientName != "" {
		greeting = "Hi " + firstName(d.RecipientName)
	}
	inviterAt := ""
	if d.InviterHandle != "" {
		inviterAt = "@" + d.InviterHandle
	}
	roleLine := "as a viewer — you'll be able to see everything"
	if strings.EqualFold(d.Role, "contributor") {
		roleLine = "as a contributor — you'll be able to edit and add things"
	}
	preview := fmt.Sprintf("%s invited you to %s \"%s\" on Beyond.", d.InviterName, d.ResourceKind, d.ResourceName)
	return inviteTmplData{
		Greeting:     greeting,
		InviterName:  d.InviterName,
		InviterAt:    inviterAt,
		ResourceKind: d.ResourceKind,
		ResourceName: d.ResourceName,
		RoleLine:     roleLine,
		CTALabel:     "Open invite",
		InviteURL:    d.InviteURL,
		PreviewText:  preview,
	}
}

func firstName(s string) string {
	s = strings.TrimSpace(s)
	if i := strings.IndexAny(s, " \t"); i > 0 {
		return s[:i]
	}
	return s
}

func renderInviteEmail(d InviteEmailData) (htmlBody, textBody string, err error) {
	td := buildTmplData(d)

	var hbuf bytes.Buffer
	if err := inviteHTMLTmpl.Execute(&hbuf, td); err != nil {
		return "", "", err
	}
	var tbuf bytes.Buffer
	if err := inviteTextTmpl.Execute(&tbuf, td); err != nil {
		return "", "", err
	}
	return hbuf.String(), tbuf.String(), nil
}

// Style notes: Beyond uses a warm cream background, orange-to-rose gradient,
// rounded 12px corners. Email HTML is intentionally table-based and inline
// styled for client compatibility (Outlook, Gmail clipping, etc.).
var inviteHTMLTmpl = template.Must(template.New("invite_html").Parse(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>You're invited to Beyond</title>
</head>
<body style="margin:0;padding:0;background-color:#fbf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;color:#1a1310;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{{.PreviewText}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fbf8f5;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="padding:8px 0 24px 0;">
            <span style="font-size:22px;font-weight:800;letter-spacing:-0.01em;background:linear-gradient(90deg,#f97316,#f43f5e);-webkit-background-clip:text;background-clip:text;color:#f97316;">Beyond</span>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;border:1px solid #ebe2da;border-radius:12px;padding:36px 36px 32px 36px;box-shadow:0 1px 2px rgba(26,19,16,0.04);">
            <p style="margin:0 0 18px 0;font-size:15px;line-height:1.55;color:#847066;">{{.Greeting}},</p>
            <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.3;font-weight:700;color:#1a1310;letter-spacing:-0.01em;">
              {{.InviterName}} invited you to &ldquo;{{.ResourceName}}&rdquo;
            </h1>
            <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#3d2e25;">
              You've been added to this {{.ResourceKind}} on Beyond {{.RoleLine}}.{{if .InviterAt}} Invite sent by <span style="color:#847066;">{{.InviterAt}}</span>.{{end}}
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px 0;">
              <tr>
                <td style="border-radius:10px;background:linear-gradient(90deg,#f97316,#f43f5e);">
                  <a href="{{.InviteURL}}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.005em;">
                    {{.CTALabel}} &rarr;
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0 0;font-size:13px;line-height:1.55;color:#847066;">
              Or paste this link into your browser:<br />
              <a href="{{.InviteURL}}" style="color:#ea580c;word-break:break-all;text-decoration:underline;">{{.InviteURL}}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 8px 8px 8px;font-size:12px;line-height:1.5;color:#a09084;">
            You received this email because someone invited you to a {{.ResourceKind}} on Beyond. If you weren't expecting this, you can safely ignore it.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`))

var inviteTextTmpl = template.Must(template.New("invite_text").Parse(`{{.Greeting}},

{{.InviterName}} invited you to "{{.ResourceName}}" on Beyond.

You've been added to this {{.ResourceKind}} {{.RoleLine}}.{{if .InviterAt}} Invite sent by {{.InviterAt}}.{{end}}

Open the invite:
{{.InviteURL}}

—
You received this email because someone invited you to a {{.ResourceKind}} on Beyond. If you weren't expecting this, you can safely ignore it.
`))
