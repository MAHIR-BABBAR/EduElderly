import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/toast';

const api = vi.hoisted(() => ({ enrollment: vi.fn(), course: vi.fn(), content: vi.fn(), progress: vi.fn(), categories: vi.fn() }));
vi.mock('@/lib/api', () => ({
  enrollmentApi: { get: api.enrollment, topicContent: api.content, progress: api.progress },
  courseApi: { getById: api.course, listCategories: api.categories },
}));

import { LearningPage } from '@/pages/LearningPage';

const renderAt = (url) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/learn/:enrollmentId" element={<LearningPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  api.categories.mockResolvedValue({ data: [] });
  api.enrollment.mockResolvedValue({
    data: { enrollmentId: 'enr-1', courseId: 'c1', status: 'active', progressPercent: 33, completedTopics: ['t1'], course: { title: 'Healthy Living', topicCount: 3 } },
  });
  api.course.mockResolvedValue({
    data: { courseId: 'c1', title: 'Healthy Living', modules: [{ moduleId: 'm1', title: 'Week 1', topics: [{ topicId: 't1', title: 'Walking', durationMinutes: 5 }, { topicId: 't2', title: 'Sleep', durationMinutes: 7 }, { topicId: 't3', title: 'Food' }] }] },
  });
});

describe('LearningPage', () => {
  it('opens the first unfinished lesson in a sandboxed YouTube frame', async () => {
    api.content.mockResolvedValue({ data: { contentUrl: 'https://www.youtube.com/watch?v=z_GKdFf3qv4' } });
    renderAt('/learn/enr-1');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Lesson 2. Sleep');
    const frame = await screen.findByTitle('Sleep');
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    expect(frame.getAttribute('src')).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\//);
    expect(screen.getByRole('link', { name: /Next lesson/ })).toHaveAttribute('href', '/learn/enr-1?topic=t3');
    expect(screen.getByRole('progressbar', { name: 'Progress' })).toHaveAttribute('aria-valuetext', '1 of 3 lessons');
  });

  it('never frames a non-YouTube URL — offers a link instead', async () => {
    api.content.mockResolvedValue({ data: { contentUrl: 'https://medlineplus.gov/reading' } });
    renderAt('/learn/enr-1?topic=t3');
    expect(await screen.findByRole('link', { name: /Open the lesson/ })).toHaveAttribute('href', 'https://medlineplus.gov/reading');
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('opens a specific lesson from ?topic and shows it as finished when it is', async () => {
    api.content.mockResolvedValue({ data: { contentUrl: 'https://youtu.be/z_GKdFf3qv4' } });
    renderAt('/learn/enr-1?topic=t1');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Lesson 1. Walking');
    expect(await screen.findByText('Finished')).toBeInTheDocument();
  });
});
