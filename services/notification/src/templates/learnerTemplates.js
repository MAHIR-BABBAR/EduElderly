const {
  escapeHtml,
  wrapEmail,
  renderButton,
  renderInfoCard,
  BRAND,
} = require('./emailLayout');

const greeting = (name) =>
  `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:${BRAND.text};">
    Hi ${name},
  </p>`;

const LEARNER_TYPES = ['welcome', 'enroll', 'quiz_result', 'completion'];

const renderWelcomeEmail = (templateData = {}) => {
  const name = escapeHtml(templateData.name || 'there');
  const rawName = templateData.name || 'there';
  const appUrl = escapeHtml(templateData.appUrl || 'http://localhost:5173');

  const bodyHtml = `
    ${greeting(name)}
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:${BRAND.text};">
      Your email is verified and your account is ready. Browse courses, track your progress, and earn certificates along the way.
    </p>
    ${renderButton(appUrl, 'Explore courses')}
    ${renderInfoCard(`
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${BRAND.text};">
        Tip: use the accessibility settings to adjust font size and high-contrast mode any time.
      </p>
    `)}`;

  return {
    subject: 'Welcome to EduElderly',
    htmlContent: wrapEmail({
      preheader: 'Your EduElderly account is ready — start learning today.',
      eyebrow: 'Welcome',
      headline: 'You are all set',
      bodyHtml,
    }),
    textContent: [
      `Hi ${rawName},`,
      '',
      'Welcome to EduElderly! Your email is verified and your account is ready.',
      '',
      'Browse courses and start learning at your own pace.',
      '',
      '— EduElderly',
    ].join('\n'),
  };
};

const renderEnrollEmail = (templateData = {}) => {
  const name = escapeHtml(templateData.name || 'there');
  const rawName = templateData.name || 'there';
  const courseTitle = escapeHtml(templateData.courseTitle || 'your course');

  const bodyHtml = `
    ${greeting(name)}
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:${BRAND.text};">
      You have successfully enrolled in <strong>${courseTitle}</strong>. Your learning journey starts now.
    </p>
    ${renderInfoCard(`
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${BRAND.text};">
        Open your dashboard to resume where you left off at any time.
      </p>
    `)}`;

  return {
    subject: `Enrolled: ${templateData.courseTitle || 'Course'}`,
    htmlContent: wrapEmail({
      preheader: `You enrolled in ${templateData.courseTitle || 'a course'}.`,
      eyebrow: 'Enrollment',
      headline: 'You are enrolled',
      bodyHtml,
    }),
    textContent: [
      `Hi ${rawName},`,
      '',
      `You have enrolled in ${templateData.courseTitle || 'your course'}.`,
      '',
      '— EduElderly',
    ].join('\n'),
  };
};

const renderQuizResultEmail = (templateData = {}) => {
  const name = escapeHtml(templateData.name || 'there');
  const rawName = templateData.name || 'there';
  const quizTitle = escapeHtml(templateData.quizTitle || 'Quiz');
  const score = templateData.score ?? 0;
  const passed = Boolean(templateData.passed);
  const resultLabel = passed ? 'Passed' : 'Not passed';

  const bodyHtml = `
    ${greeting(name)}
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:${BRAND.text};">
      Your quiz result for <strong>${quizTitle}</strong>: <strong>${resultLabel}</strong> with a score of <strong>${score}%</strong>.
    </p>`;

  return {
    subject: `Quiz result: ${templateData.quizTitle || 'Quiz'} — ${resultLabel}`,
    htmlContent: wrapEmail({
      preheader: `Quiz result for ${templateData.quizTitle || 'quiz'}: ${score}%`,
      eyebrow: 'Quiz',
      headline: passed ? 'Great work!' : 'Keep practicing',
      bodyHtml,
    }),
    textContent: [
      `Hi ${rawName},`,
      '',
      `Quiz: ${templateData.quizTitle || 'Quiz'}`,
      `Score: ${score}% — ${resultLabel}`,
      '',
      '— EduElderly',
    ].join('\n'),
  };
};

const renderCompletionEmail = (templateData = {}) => {
  const name = escapeHtml(templateData.name || 'there');
  const rawName = templateData.name || 'there';
  const courseTitle = escapeHtml(templateData.courseTitle || 'your course');
  const verifyUrl = templateData.verifyUrl ? escapeHtml(templateData.verifyUrl) : null;

  let certSection = '';
  if (verifyUrl) {
    certSection = `${renderButton(verifyUrl, 'View certificate')}`;
  }

  const bodyHtml = `
    ${greeting(name)}
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:${BRAND.text};">
      Congratulations! You completed <strong>${courseTitle}</strong>. Your certificate is ready.
    </p>
    ${certSection}
    ${renderInfoCard(`
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${BRAND.text};">
        Share your verify link with others to confirm your achievement.
      </p>
    `)}`;

  return {
    subject: `Course completed: ${templateData.courseTitle || 'Course'}`,
    htmlContent: wrapEmail({
      preheader: `You completed ${templateData.courseTitle || 'your course'}!`,
      eyebrow: 'Achievement',
      headline: 'Course complete',
      bodyHtml,
    }),
    textContent: [
      `Hi ${rawName},`,
      '',
      `Congratulations! You completed ${templateData.courseTitle || 'your course'}.`,
      templateData.verifyUrl ? `Verify your certificate: ${templateData.verifyUrl}` : '',
      '',
      '— EduElderly',
    ].filter(Boolean).join('\n'),
  };
};

const renderLearnerEmail = (type, templateData = {}) => {
  switch (type) {
    case 'welcome':
      return renderWelcomeEmail(templateData);
    case 'enroll':
      return renderEnrollEmail(templateData);
    case 'quiz_result':
      return renderQuizResultEmail(templateData);
    case 'completion':
      return renderCompletionEmail(templateData);
    default:
      throw new Error(`Unknown learner email type: ${type}`);
  }
};

module.exports = { LEARNER_TYPES, renderLearnerEmail };
