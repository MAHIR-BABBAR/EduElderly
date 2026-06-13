const {
  escapeHtml,
  wrapEmail,
  renderButton,
  renderOtpBox,
  renderInfoCard,
  renderLinkFallback,
  BRAND,
} = require('./emailLayout');

const VALID_TYPES = ['otp', 'email_verification', 'password_reset'];

const greeting = (name) =>
  `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:${BRAND.text};">
    Hi ${name},
  </p>`;

const renderAuthEmail = (type, templateData = {}) => {
  if (!VALID_TYPES.includes(type)) {
    throw new Error(`Unknown email type: ${type}`);
  }

  const name = escapeHtml(templateData.name || 'there');
  const rawName = templateData.name || 'there';
  const otp = escapeHtml(templateData.otp || '');
  const link = escapeHtml(templateData.link || '');

  if (type === 'otp') {
    const bodyHtml = `
      ${greeting(name)}
      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:${BRAND.text};">
        Use the code below to finish signing in. For your security, it expires in <strong>3 minutes</strong>.
      </p>
      ${renderOtpBox(otp)}
      ${renderInfoCard(`
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${BRAND.text};">
          <strong>Did not request this?</strong> You can safely ignore this email. Your password has not been changed.
        </p>
      `)}`;

    return {
      subject: 'Your EduElderly login code',
      htmlContent: wrapEmail({
        preheader: `Your login code is ${templateData.otp}. It expires in 3 minutes.`,
        eyebrow: 'Secure sign-in',
        headline: 'Your one-time login code',
        bodyHtml,
      }),
      textContent: [
        `Hi ${rawName},`,
        '',
        'Your EduElderly login code is:',
        '',
        templateData.otp,
        '',
        'This code expires in 3 minutes.',
        '',
        'If you did not request this code, you can ignore this email.',
        '',
        '— EduElderly',
      ].join('\n'),
    };
  }

  if (type === 'email_verification') {
    const bodyHtml = `
      ${greeting(name)}
      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:${BRAND.text};">
        Welcome aboard! Confirm your email address to activate your account and start exploring courses.
      </p>
      ${renderButton(link, 'Verify my email')}
      ${renderLinkFallback(link)}
      ${renderInfoCard(`
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${BRAND.text};">
          This verification link expires in <strong>24 hours</strong>.
        </p>
      `)}`;

    return {
      subject: 'Verify your EduElderly account',
      htmlContent: wrapEmail({
        preheader: 'Confirm your email to activate your EduElderly account.',
        eyebrow: 'Welcome',
        headline: 'One step left to get started',
        bodyHtml,
      }),
      textContent: [
        `Hi ${rawName},`,
        '',
        'Thanks for signing up for EduElderly.',
        '',
        'Verify your email by opening this link:',
        templateData.link,
        '',
        'This link expires in 24 hours.',
        '',
        '— EduElderly',
      ].join('\n'),
    };
  }

  const bodyHtml = `
    ${greeting(name)}
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:${BRAND.text};">
      We received a request to reset the password for your account. Click below to choose a new password.
    </p>
    ${renderButton(link, 'Reset my password')}
    ${renderLinkFallback(link)}
    ${renderInfoCard(`
      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${BRAND.text};">
        This link expires in <strong>1 hour</strong>.
      </p>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${BRAND.danger};">
        <strong>Did not request a reset?</strong> Ignore this email — your password will stay the same.
      </p>
    `)}`;

  return {
    subject: 'Reset your EduElderly password',
    htmlContent: wrapEmail({
      preheader: 'Reset your EduElderly password. Link expires in 1 hour.',
      eyebrow: 'Account security',
      headline: 'Password reset requested',
      bodyHtml,
    }),
    textContent: [
      `Hi ${rawName},`,
      '',
      'We received a request to reset your EduElderly password.',
      '',
      'Reset your password by opening this link:',
      templateData.link,
      '',
      'This link expires in 1 hour.',
      '',
      'If you did not request this, you can ignore this email.',
      '',
      '— EduElderly',
    ].join('\n'),
  };
};

module.exports = { VALID_TYPES, renderAuthEmail };
