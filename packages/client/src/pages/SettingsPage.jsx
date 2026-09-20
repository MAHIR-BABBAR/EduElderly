import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { Contrast, KeyRound, Type, UserRound } from 'lucide-react';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useAuthStore } from '@/stores/authStore';
import { userApi } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SegmentedControl } from '@/components/ui/segmented';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const SIZE_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
  { value: 'xl', label: 'Extra large' },
  { value: 'huge', label: 'Huge' },
];

/**
 * Settings (plan S-8). The accessibility controls that define the product
 * come first and apply live — the whole app re-themes as the learner
 * chooses, with a preview paragraph so they see the effect before leaving
 * the page. Profile and account follow in their own tabs.
 */
export function SettingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const { fontSizePref, highContrast, updatePrefs } = useAccessibility();
  const toasts = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(profile?.name ?? '');
  const [nameError, setNameError] = useState('');

  const setPref = async (updates) => {
    try {
      await updatePrefs(updates);
    } catch (err) {
      toasts.error('Could not save that setting', { description: err.message });
    }
  };

  const saveName = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError('Please enter at least two characters.');
      return;
    }
    setNameError('');
    setSaving(true);
    try {
      await userApi.updateProfile({ name: trimmed });
      await refreshProfile();
      toasts.success('Name updated');
    } catch (err) {
      toasts.error('Could not update your name', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container max-w-3xl pb-24 md:pb-12">
      <PageHeader
        eyebrow="Settings"
        title={
          <>
            Make it <span className="accent-word">comfortable</span>
          </>
        }
        documentTitle="Settings"
        description="Text size and contrast change the whole site the moment you choose them, and they are remembered."
      />

      <Tabs defaultValue="accessibility">
        <TabsList aria-label="Settings sections" className="mb-6">
          <TabsTrigger value="accessibility">
            <Type className="h-5 w-5" aria-hidden="true" />
            Reading
          </TabsTrigger>
          <TabsTrigger value="profile">
            <UserRound className="h-5 w-5" aria-hidden="true" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="account">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accessibility" className="space-y-6">
          <section className="rounded-xl border border-brand-border bg-brand-surface-raised p-6 shadow-card sm:p-8" aria-labelledby="text-size-heading">
            <h2 id="text-size-heading" className="font-display text-2xl text-brand-primary-dark">Text size</h2>
            <p className="mt-1 text-brand-muted">Pick the size that is easiest on your eyes. You can also use the A− / A+ buttons at the top of every page.</p>
            <div className="mt-5">
              <SegmentedControl label="Text size" value={fontSizePref} options={SIZE_OPTIONS} onValueChange={(v) => setPref({ fontSizePref: v })} />
            </div>
          </section>

          <section className="rounded-xl border border-brand-border bg-brand-surface-raised p-6 shadow-card sm:p-8" aria-labelledby="contrast-heading">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 id="contrast-heading" className="font-display text-2xl text-brand-primary-dark">High contrast</h2>
                <p className="mt-1 text-brand-muted">Black text on white, thicker borders, and no colour tints or textures.</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Label htmlFor="high-contrast" className="mb-0 font-semibold">
                  {highContrast ? 'On' : 'Off'}
                </Label>
                <SwitchPrimitive.Root
                  id="high-contrast"
                  checked={highContrast}
                  onCheckedChange={(checked) => setPref({ highContrast: checked })}
                  className={cn(
                    'relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors duration-fast',
                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink focus-visible:ring-offset-2',
                    highContrast ? 'border-brand-primary bg-brand-primary' : 'border-brand-border-strong bg-brand-surface-sunken',
                  )}
                >
                  <SwitchPrimitive.Thumb
                    className={cn(
                      'block h-6 w-6 rounded-full bg-white shadow-card transition-transform duration-fast',
                      highContrast ? 'translate-x-6' : 'translate-x-0.5',
                    )}
                  />
                </SwitchPrimitive.Root>
              </div>
            </div>
          </section>

          {/* Live preview: reads whatever the settings currently are. */}
          <section className="rounded-xl border border-dashed border-brand-border-strong p-6 sm:p-8" aria-live="polite" aria-labelledby="preview-heading">
            <p id="preview-heading" className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-muted">
              <Contrast className="mr-1 inline h-4 w-4" aria-hidden="true" />
              How the site looks now
            </p>
            <h3 className="mt-3 font-display text-2xl text-brand-primary-dark">Lesson 2. Walking for balance</h3>
            <p className="mt-2 max-w-[60ch] text-brand-text">
              This is how lesson text will read. A short walk most days helps with balance and mood. Start with ten minutes and add a little each week.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button className="min-h-touch-primary" type="button">A primary button</Button>
              <Button variant="outline" type="button">A secondary one</Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="profile">
          <form onSubmit={saveName} className="rounded-xl border border-brand-border bg-brand-surface-raised p-6 shadow-card sm:p-8" noValidate>
            <h2 className="font-display text-2xl text-brand-primary-dark">Your name</h2>
            <p className="mt-1 text-brand-muted">Used in greetings and printed on your certificates.</p>
            <div className="mt-5 max-w-md">
              <Label htmlFor="profile-name">Full name</Label>
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'profile-name-error' : undefined} className="mt-1" />
              {nameError && <p id="profile-name-error" className="mt-2 text-sm font-semibold text-brand-danger">{nameError}</p>}
            </div>
            <Button type="submit" size="lg" className="mt-5" loading={saving} loadingLabel="Saving…" disabled={name.trim() === (profile?.name ?? '')}>
              Save name
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="account">
          <section className="rounded-xl border border-brand-border bg-brand-surface-raised p-6 shadow-card sm:p-8">
            <h2 className="font-display text-2xl text-brand-primary-dark">Sign-in details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-muted">Email</dt>
                <dd className="mt-1 text-lg">{profile?.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-muted">Account type</dt>
                <dd className="mt-1 text-lg capitalize">{profile?.role || 'learner'}</dd>
              </div>
            </dl>
            <Alert variant="info" className="mt-5">To change your email, write to support and a person will help.</Alert>
            <Button asChild variant="outline" size="lg" className="mt-5">
              <Link to="/forgot-password">Change password</Link>
            </Button>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
