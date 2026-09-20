import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const api = vi.hoisted(() => ({
  enrollments: vi.fn(),
  certificates: vi.fn(),
  courses: vi.fn(),
  categories: vi.fn(),
  course: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  enrollmentApi: { list: api.enrollments },
  certificateApi: { listMine: api.certificates },
  courseApi: { list: api.courses, listCategories: api.categories, getById: api.course },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => selector({ profile: { name: 'Margaret Jones', totalXP: 120 } }),
}));

import { DashboardPage } from '@/pages/DashboardPage';

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const HEALTH = { categoryId: 'cat-1', name: 'Health & Wellness', slug: 'health-wellness' };

beforeEach(() => {
  vi.setSystemTime(new Date(2026, 8, 20, 19, 0)); // 7pm → "Good evening"
  api.categories.mockResolvedValue({ data: [HEALTH] });
  api.certificates.mockResolvedValue({ data: [] });
  api.courses.mockResolvedValue({ data: [] });
  api.course.mockResolvedValue({ data: { modules: [] } });
});

describe('DashboardPage', () => {
  it('greets by time of day with the first name as the h1', async () => {
    api.enrollments.mockResolvedValue({ data: [] });
    renderPage();
    const h1 = await screen.findByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Good evening, Margaret.');
  });

  it('shows the empty state with a way into the catalog when nothing is enrolled', async () => {
    api.enrollments.mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText('You have not started a course yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse courses' })).toHaveAttribute('href', '/courses');
  });

  it('resumes the most recent active course and colours it by subject world', async () => {
    api.enrollments.mockResolvedValue({
      data: [
        {
          enrollmentId: 'enr-1',
          courseId: 'c-1',
          status: 'active',
          progressPercent: 40,
          completedTopics: ['t1', 't2'],
          currentLessonId: 't3',
          lastAccessedAt: new Date(2026, 8, 19).toISOString(),
          course: { courseId: 'c-1', title: 'Healthy Living', thumbnailUrl: '/covers/x.svg', categoryId: 'cat-1', topicCount: 5 },
        },
      ],
    });
    renderPage();
    const resume = await screen.findByRole('link', { name: /Resume lesson/ });
    expect(resume).toHaveAttribute('href', '/learn/enr-1');
    await waitFor(() => expect(screen.getByRole('progressbar', { name: 'Lessons' })).toHaveAttribute('aria-valuetext', '2 of 5 lessons'));
    const cover = document.querySelector('[data-course-cover="c-1"]');
    expect(cover).toHaveAttribute('data-world', 'health');
    expect(screen.getByText('Last opened yesterday.', { exact: false })).toBeInTheDocument();
  });

  it('offers a retry when progress cannot be loaded', async () => {
    api.enrollments.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load your progress');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
