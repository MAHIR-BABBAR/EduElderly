import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/toast';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';

const api = vi.hoisted(() => ({ updateProfile: vi.fn() }));
vi.mock('@/lib/api', () => ({ userApi: { updateProfile: api.updateProfile } }));
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) =>
    selector({ isAuthenticated: false, profile: null, refreshProfile: vi.fn() }),
}));

import { SettingsPage } from '@/pages/SettingsPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <AccessibilityProvider>
        <ToastProvider>
          <SettingsPage />
        </ToastProvider>
      </AccessibilityProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.fontSize;
  delete document.documentElement.dataset.highContrast;
});

describe('SettingsPage', () => {
  it('changes text size for the whole document the moment it is chosen', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'Huge' }));
    await waitFor(() => expect(document.documentElement.dataset.fontSize).toBe('huge'));
    expect(JSON.parse(window.localStorage.getItem('eduelderly:a11y')).fontSizePref).toBe('huge');
  });

  it('toggles high contrast live', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('switch', { name: 'Off' }));
    await waitFor(() => expect(document.documentElement.dataset.highContrast).toBe('true'));
    expect(screen.getByRole('switch', { name: 'On' })).toBeChecked();
  });
});
