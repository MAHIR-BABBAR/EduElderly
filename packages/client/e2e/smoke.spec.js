import { test, expect } from '@playwright/test';

test.describe('EduElderly public pages', () => {
  test('landing page loads with brand and skip link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /learning made welcoming/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /browse courses/i }).first()).toBeVisible();
  });

  test('course catalog page loads', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: 'Course catalog' })).toBeVisible();
  });

  test('login page has accessible form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('certificate verify page loads', async ({ page }) => {
    await page.goto('/verify-certificate');
    await expect(page.getByRole('heading', { name: 'Verify a certificate' })).toBeVisible();
    await expect(page.getByLabel('Certificate ID')).toBeVisible();
  });
});
