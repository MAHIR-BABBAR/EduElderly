const { renderEmail } = require('../src/templates');

describe('Learner email templates', () => {
  describe('completion', () => {
    it('renders the certificate variant when a verify URL is present', () => {
      const email = renderEmail('completion', {
        name: 'Margaret',
        courseTitle: 'Digital Basics',
        certId: 'cert-1',
        verifyUrl: 'http://localhost:5173/verify-certificate?certId=cert-1',
      });

      expect(email.subject).toBe('Certificate ready: Digital Basics');
      expect(email.htmlContent).toContain('Your certificate is ready');
      expect(email.htmlContent).toContain('View certificate');
      expect(email.textContent).toContain('Verify your certificate:');
    });

    it('renders the quizzes-remaining variant when no certificate exists yet', () => {
      const email = renderEmail('completion', {
        name: 'Margaret',
        courseTitle: 'Digital Basics',
        quizzesRemaining: 2,
      });

      expect(email.subject).toBe('Lessons complete: Digital Basics');
      expect(email.htmlContent).toContain('Pass the remaining 2 quizzes');
      expect(email.htmlContent).not.toContain('View certificate');
      expect(email.textContent).not.toContain('Verify your certificate');
    });

    it('uses singular wording for one remaining quiz', () => {
      const email = renderEmail('completion', {
        courseTitle: 'Digital Basics',
        quizzesRemaining: 1,
      });
      expect(email.htmlContent).toContain('remaining 1 quiz ');
    });

    it('escapes HTML in the course title', () => {
      const email = renderEmail('completion', {
        courseTitle: '<script>alert(1)</script>',
        quizzesRemaining: 1,
      });
      expect(email.htmlContent).not.toContain('<script>');
    });
  });
});
