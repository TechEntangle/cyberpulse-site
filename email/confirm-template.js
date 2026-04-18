#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// CyberPulse · Double opt-in confirmation email template
//
// Produces a branded HTML + plain-text email asking the subscriber
// to click a link to confirm their subscription.
// ─────────────────────────────────────────────────────────────────

function buildConfirmEmail({ email, confirmUrl }) {
  const logoUrl = 'https://tusharvartak.com/assets/brand/logo-square.png';
  const siteUrl = 'https://tusharvartak.com';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Confirm your CyberPulse subscription</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    body { margin: 0; padding: 0; width: 100% !important; }
    :root { color-scheme: dark; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#06070a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden;" aria-hidden="true">
    Confirm your subscription to CyberPulse executive cyber intelligence.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#06070a;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px; background-color:#0f1218; border-radius:20px; border:1px solid rgba(255,255,255,0.06);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 0; text-align:center;">
              <img src="${logoUrl}" alt="CyberPulse" width="44" height="44" style="display:inline-block; border-radius:10px;" />
              <div style="margin-top:14px; font-size:18px; font-weight:800; color:#f6f1e8; letter-spacing:-0.03em;">CyberPulse</div>
              <div style="margin-top:6px; font-family:Menlo,Consolas,monospace; font-size:11px; color:#9e9689; letter-spacing:0.12em; text-transform:uppercase;">Confirm subscription</div>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding: 24px 32px 0;">
              <div style="height:1px; background: linear-gradient(90deg, rgba(240,180,74,0.4), rgba(240,180,74,0.08), transparent);"></div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px 32px 0;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.65; color:#c9bfb1;">
                You requested to subscribe to <strong style="color:#f6f1e8;">CyberPulse</strong> executive cyber intelligence briefings.
              </p>
              <p style="margin:0 0 28px; font-size:16px; line-height:1.65; color:#c9bfb1;">
                Click the button below to confirm your subscription. This link expires naturally with your subscription token.
              </p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px; background-color:#f0b44a;">
                    <a href="${confirmUrl}" target="_blank" style="display:inline-block; padding:16px 36px; font-size:15px; font-weight:800; color:#15120c; text-decoration:none; border-radius:999px; background-color:#f0b44a; letter-spacing:-0.01em;">
                      Confirm my subscription
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Fallback link -->
          <tr>
            <td style="padding: 20px 32px 0;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#6b6560;">
                If the button doesn&rsquo;t work, copy and paste this link into your browser:
              </p>
              <p style="margin:6px 0 0; font-size:12px; line-height:1.5; word-break:break-all;">
                <a href="${confirmUrl}" style="color:#f0b44a; text-decoration:none;">${confirmUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Security note -->
          <tr>
            <td style="padding: 28px 32px 0;">
              <div style="height:1px; background:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px 32px;">
              <p style="margin:0; font-size:12px; line-height:1.6; color:#6b6560;">
                If you didn&rsquo;t request this subscription, you can safely ignore this email. No action will be taken.
              </p>
              <p style="margin:8px 0 0; font-size:12px; line-height:1.6;">
                <a href="${siteUrl}" style="color:#9e9689; text-decoration:underline;">tusharvartak.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `CYBERPULSE — Confirm your subscription
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You requested to subscribe to CyberPulse executive cyber intelligence briefings.

Click the link below to confirm your subscription:
${confirmUrl}

If you didn't request this, you can safely ignore this email.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CyberPulse — https://tusharvartak.com`;

  return { html, text };
}

module.exports = { buildConfirmEmail };
