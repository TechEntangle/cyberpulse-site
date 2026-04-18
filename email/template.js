#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// CyberPulse · Premium email template generator
// Produces Resend-compatible HTML + plain-text for newsletter sends.
//
// Usage (as module):
//   const { html, text } = require('./template')({ title, desc, date, url, edition })
//
// Usage (CLI preview):
//   node email/template.js --title "Title" --desc "Desc" --date 2026-04-18
// ─────────────────────────────────────────────────────────────────

function buildEmail({ title, desc, date, url, edition, unsubToken }) {
  const displayDate = formatDate(date);
  const postUrl = url || `https://tusharvartak.com/posts/${date}.html`;
  const editionNum = edition || '\u2014';
  const apiBase = process.env.CYBERPULSE_API_URL || 'https://tusharvartak.com/api';
  const unsubUrl = unsubToken
    ? `${apiBase}/unsubscribe?token=${unsubToken}`
    : 'https://tusharvartak.com/email/unsubscribe.html';
  const prefsUrl = 'https://tusharvartak.com/email/unsubscribe.html';
  const siteUrl = 'https://tusharvartak.com';
  const logoUrl = 'https://tusharvartak.com/assets/brand/logo-square.png';

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>CyberPulse &bull; ${escHtml(title)}</title>
  <!--[if mso]>
  <noscript><xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml></noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    /* Dark mode support */
    :root { color-scheme: dark; supported-color-schemes: dark; }
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #06070a !important; }
      .email-card { background-color: #0f1218 !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#06070a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;" aria-hidden="true">
    ${escHtml(desc)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Outer wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#06070a;" class="email-bg">
    <tr>
      <td align="center" style="padding: 32px 16px 20px;">

        <!-- Inner card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background-color:#0f1218; border-radius:20px; border:1px solid rgba(255,255,255,0.06); overflow:hidden;" class="email-card">

          <!-- Header bar -->
          <tr>
            <td style="padding: 28px 32px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="vertical-align:middle; width:40px;">
                    <img src="${logoUrl}" alt="CP" width="36" height="36" style="display:block; border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle; padding-left:14px;">
                    <span style="font-size:17px; font-weight:800; color:#f6f1e8; letter-spacing:-0.03em;">CyberPulse</span>
                  </td>
                  <td style="vertical-align:middle; text-align:right;">
                    <span style="font-family:Menlo,Consolas,monospace; font-size:11px; font-weight:600; color:#f0b44a; letter-spacing:0.12em; text-transform:uppercase;">Edition ${escHtml(String(editionNum))}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 20px 32px 0;">
              <div style="height:1px; background: linear-gradient(90deg, rgba(240,180,74,0.4), rgba(240,180,74,0.08), transparent);"></div>
            </td>
          </tr>

          <!-- Date + label -->
          <tr>
            <td style="padding: 24px 32px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:8px; height:8px; border-radius:50%; background-color:#f0b44a; vertical-align:middle;"></td>
                  <td style="padding-left:10px; vertical-align:middle;">
                    <span style="font-family:Menlo,Consolas,monospace; font-size:11px; font-weight:600; color:#9e9689; letter-spacing:0.14em; text-transform:uppercase;">New briefing &bull; ${escHtml(displayDate)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 18px 32px 0;">
              <h1 style="margin:0; font-size:32px; line-height:1.08; font-weight:900; color:#f6f1e8; letter-spacing:-0.04em;">
                ${escHtml(title)}
              </h1>
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td style="padding: 14px 32px 0;">
              <p style="margin:0; font-size:17px; line-height:1.65; color:#c9bfb1;">
                ${escHtml(desc)}
              </p>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td style="padding: 28px 32px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px; background-color:#f0b44a; mso-padding-alt:0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${postUrl}" style="height:48px; v-text-anchor:middle; width:240px;" arcsize="50%" strokecolor="#f0b44a" fillcolor="#f0b44a">
                    <w:anchorlock/>
                    <center style="font-size:14px; font-weight:bold; color:#15120c; font-family:sans-serif;">Read the full briefing &rarr;</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${postUrl}" target="_blank" style="display:inline-block; padding:14px 28px; font-size:14px; font-weight:800; color:#15120c; text-decoration:none; border-radius:999px; background-color:#f0b44a; letter-spacing:-0.01em;">
                      Read the full briefing &rarr;
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Secondary link -->
          <tr>
            <td style="padding: 14px 32px 0;">
              <a href="${siteUrl}" target="_blank" style="font-size:13px; color:#f0b44a; text-decoration:none; font-weight:600; letter-spacing:0.01em;">
                Visit tusharvartak.com &rarr;
              </a>
            </td>
          </tr>

          <!-- Bottom divider -->
          <tr>
            <td style="padding: 32px 32px 0;">
              <div style="height:1px; background:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0; font-size:12px; line-height:1.6; color:#6b6560;">
                      CyberPulse &mdash; Executive cyber intelligence by Tushar Vartak.<br />
                      You received this because you subscribed at tusharvartak.com.
                    </p>
                    <p style="margin:10px 0 0; font-size:12px; line-height:1.6;">
                      <a href="${unsubUrl}" target="_blank" style="color:#9e9689; text-decoration:underline;">Unsubscribe</a>
                      <span style="color:#3d3830; padding:0 6px;">&middot;</span>
                      <a href="${prefsUrl}" target="_blank" style="color:#9e9689; text-decoration:underline;">Manage preferences</a>
                      <span style="color:#3d3830; padding:0 6px;">&middot;</span>
                      <a href="${siteUrl}" target="_blank" style="color:#9e9689; text-decoration:underline;">View online</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Inner card -->

      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->

</body>
</html>`;

  const text = `CYBERPULSE · Edition ${editionNum}
${displayDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${title}

${desc}

Read the full briefing:
${postUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CyberPulse — Executive cyber intelligence by Tushar Vartak.
https://tusharvartak.com

Unsubscribe: ${unsubUrl}`;

  return { html, text };
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });
}

// ── CLI preview mode ─────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i > -1 ? args[i + 1] : ''; };

  const title = get('--title') || 'The Executive Is the New Perimeter';
  const desc = get('--desc') || 'Why SharePoint exploitation and executive-targeted social engineering now belong in the same board-level conversation.';
  const date = get('--date') || '2026-04-18';
  const edition = get('--edition') || '1';

  if (args.includes('--text')) {
    process.stdout.write(buildEmail({ title, desc, date, edition }).text);
  } else {
    process.stdout.write(buildEmail({ title, desc, date, edition }).html);
  }
}

module.exports = buildEmail;
