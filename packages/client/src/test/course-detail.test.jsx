import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const api = vi.hoisted(() => ({ course: vi.fn(), enrollments: vi.fn(), enroll: vi.fn(), categories: vi.fn() }));
const auth = vi.hoisted(() => ({ isAuthenticated: false }));

vi.mock('@/lib/api', () => ({
  courseApi: { getById: api.course, listCategories: api.categories },
  enrollmentApi: { list: api.enrollments, enroll: api.enroll },
  paymentApi: { confirmOrder: vi.fn() },
}));
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => selector({ isAuthenticated: auth.isAuthenticated, profile: null }),
}));

import { CourseDetailPage } from '@/pages/CourseDetailPage';

const COURSE = {
  data: {
    courseId: 'c1',
    title: 'Healthy Living for Older Adults',
    description: 'Simple ways to stay active.',
    categoryId: 'cat-h',
    price: 0,
    isPaid: false,
    totalTopics: 2,
    estimatedHours: 3,
    instructorName: 'EduElderly Team',
    credits: 'Public domain video lessons.',
    modules: [{ moduleId: 'm1', title: 'Week 1', topics: [{ topicId: 't1', title: 'Walking', durationMinutes: 5 }, { topicId: 't2', title: 'Sleep', durationMinutes: 7 }] }],
  },
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/courses/c1']}>
        <Routes>
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />
          <Route path="/login" element={<h1>Login page</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  auth.isAuthenticated = false;
  api.course.mockResolvedValue(COURSE);
  api.categories.mockResolvedValue({ data: [{ categoryId: 'cat-h', name: 'Health & Wellness', slug: 'health-wellness' }] });
  api.enrollments.mockResolvedValue({ data: [] });
});

describe('CourseDetailPage', () => {
  it('shows a locked syllabus and sends a visitor to sign in when they try to enrol', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Healthy Living for Older Adults');
    expect(screen.getAllByText('Locked', { exact: false }).length).toBe(2);
    expect(screen.queryByRole('link', { name: /Walking/ })).toBeNull();
    expect(screen.getByText('Public domain video lessons.')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Enrol for free' })[0]);
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('turns the syllabus into live lessons and the CTA into Continue for an enrolled learner', async () => {
    auth.isAuthenticated = true;
    api.enrollments.mockResolvedValue({
      data: [{ enrollmentId: 'enr-1', courseId: 'c1', status: 'active', completedTopics: ['t1'] }],
    });
    renderPage();
    const sleep = await screen.findByRole('link', { name: /Sleep/ });
    expect(sleep).toHaveAttribute('aria-current', 'step');
    expect(sleep).toHaveAttribute('href', '/learn/enr-1?topic=t2');
    expect(screen.getAllByRole('link', { name: /Continue learning/ })[0]).toHaveAttribute('href', '/learn/enr-1');
  });
});
