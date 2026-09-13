import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useAuthStore } from '@/stores/authStore';
import { FONT_SIZE_PREFS } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

const FONT_LABELS = {
  default: 'Default (16px)',
  large: 'Large (18px) — recommended',
  xl: 'Extra large (20px)',
  huge: 'Huge (24px)',
};

export function SettingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const { fontSizePref, highContrast, updatePrefs } = useAccessibility();
  const [fontSize, setFontSize] = useState(fontSizePref);
  const [contrast, setContrast] = useState(highContrast);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updatePrefs({ fontSizePref: fontSize, highContrast: contrast });
      setMessage('Your accessibility settings have been saved.');
    } catch (err) {
      setError(err.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container max-w-2xl space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account and how EduElderly looks on screen."
      />

      <Card id="accessibility">
        <CardHeader>
          <CardTitle>Accessibility</CardTitle>
          <CardDescription>
            Adjust text size and contrast. These settings are saved to your profile and follow you on every device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {error && <Alert variant="error">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}

            <FormField label="Text size" htmlFor="fontSize">
              <select
                id="fontSize"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="flex h-12 w-full rounded-[var(--radius-md)] border-2 border-brand-border bg-white px-4 text-[length:var(--font-size-base)]"
              >
                {FONT_SIZE_PREFS.map((pref) => (
                  <option key={pref} value={pref}>
                    {FONT_LABELS[pref]}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="flex min-h-touch items-center gap-4">
              <input
                type="checkbox"
                id="highContrast"
                checked={contrast}
                onChange={(e) => setContrast(e.target.checked)}
                className="h-6 w-6 accent-brand-primary"
              />
              <Label htmlFor="highContrast" className="mb-0 cursor-pointer">
                High contrast mode — stronger colors for easier reading
              </Label>
            </div>

            <div className="rounded-[var(--radius-md)] border-2 border-brand-border bg-brand-surface p-4">
              <p className="mb-2 text-[length:var(--font-size-sm)] font-semibold text-brand-muted">Live preview</p>
              <p className="text-[length:var(--font-size-base)]">
                This is how body text will look with your current settings. You can read comfortably at your own pace.
              </p>
            </div>

            <Button type="submit" size="lg" disabled={saving}>
              {saving ? 'Saving…' : 'Save accessibility settings'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your sign-in details. Contact support if you need to change your email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Name" htmlFor="account-name">
            <p id="account-name" className="text-[length:var(--font-size-lg)] font-semibold">
              {profile?.name || '—'}
            </p>
          </FormField>
          <FormField label="Email" htmlFor="account-email">
            <p id="account-email" className="text-[length:var(--font-size-lg)]">
              {profile?.email || '—'}
            </p>
          </FormField>
          <Button asChild variant="outline" size="lg">
            <Link to="/forgot-password">Change password</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
