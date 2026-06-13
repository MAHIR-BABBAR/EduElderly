const BRAND = {
  name: process.env.BREVO_SENDER_NAME || 'EduElderly',
  tagline: 'Learning made welcoming',
  primary: '#1B5E6B',
  primaryDark: '#134652',
  accent: '#E8A838',
  accentSoft: '#FFF4E0',
  surface: '#F7FAFB',
  text: '#1A2B32',
  textMuted: '#4A6270',
  border: '#D4E2E8',
  white: '#FFFFFF',
  danger: '#B42318',
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const renderButton = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 8px;">
    <tr>
      <td align="center" bgcolor="${BRAND.primary}" style="border-radius:10px;background-color:${BRAND.primary};">
        <a href="${href}"
           target="_blank"
           style="display:inline-block;padding:16px 32px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:${BRAND.white};text-decoration:none;border-radius:10px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;

const renderOtpBox = (otp) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td align="center" bgcolor="${BRAND.accentSoft}" style="background-color:${BRAND.accentSoft};border:2px dashed ${BRAND.accent};border-radius:12px;padding:28px 20px;">
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.textMuted};">
          Your login code
        </p>
        <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:40px;font-weight:bold;letter-spacing:0.35em;color:${BRAND.primaryDark};">
          ${otp}
        </p>
      </td>
    </tr>
  </table>`;

const renderInfoCard = (html) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td bgcolor="${BRAND.surface}" style="background-color:${BRAND.surface};border-left:4px solid ${BRAND.primary};border-radius:0 8px 8px 0;padding:16px 20px;">
        ${html}
      </td>
    </tr>
  </table>`;

const renderLinkFallback = (link) => `
  <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.textMuted};">
    If the button does not work, copy and paste this link into your browser:
  </p>
  <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;word-break:break-all;color:${BRAND.primary};">
    ${link}
  </p>`;

/**
 * @param {object} options
 * @param {string} options.preheader - Hidden preview text in inbox
 * @param {string} options.eyebrow - Small label above headline
 * @param {string} options.headline - Main heading
 * @param {string} options.bodyHtml - Inner HTML for the white content card
 * @param {string} [options.footerNote] - Optional muted footer line inside card
 */
const wrapEmail = ({ preheader, eyebrow, headline, bodyHtml, footerNote }) => {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(headline)}</title>
  <!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.surface};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.surface}" style="background-color:${BRAND.surface};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td align="center" bgcolor="${BRAND.primary}" style="background-color:${BRAND.primary};border-radius:16px 16px 0 0;padding:28px 32px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;color:${BRAND.white};letter-spacing:-0.02em;">
                ${BRAND.name}
              </p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(255,255,255,0.85);">
                ${BRAND.tagline}
              </p>
            </td>
          </tr>
          <!-- Body card -->
          <tr>
            <td bgcolor="${BRAND.white}" style="background-color:${BRAND.white};padding:36px 32px 28px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.accent};">
                ${escapeHtml(eyebrow)}
              </p>
              <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.3;font-weight:bold;color:${BRAND.text};">
                ${escapeHtml(headline)}
              </h1>
              ${bodyHtml}
              ${
                footerNote
                  ? `<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.textMuted};">${footerNote}</p>`
                  : ''
              }
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" bgcolor="${BRAND.white}" style="background-color:${BRAND.white};border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 16px 16px;padding:20px 32px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${BRAND.textMuted};">
                You received this email because an action was requested on your ${BRAND.name} account.
              </p>
              <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.textMuted};">
                &copy; ${year} ${BRAND.name}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = {
  BRAND,
  escapeHtml,
  wrapEmail,
  renderButton,
  renderOtpBox,
  renderInfoCard,
  renderLinkFallback,
};
