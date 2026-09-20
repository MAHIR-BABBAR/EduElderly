import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const api = vi.hoisted(() => ({ list: vi.fn(), categories: vi.fn() }));
vi.mock('@/lib/api', () => ({ courseApi: { list: api.list, listCategories: api.categories } }));

import { CatalogPage } from '@/pages/CatalogPage';

const renderPage = (initial = '/courses') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initial]}>
        <CatalogPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const CATS = [
  { categoryId: 'cat-h', name: 'Health & Wellness', slug: 'health-wellness' },
  { categoryId: 'cat-d', name: 'Digital Skills', slug: 'digital-skills' },
];
const COURSES = [
  { courseId: 'c1', title: 'Walking well', description: 'x', categoryId: 'cat-h', price: 0, totalTopics: 5, estimatedHours: 3, thumbnailUrl: '/covers/a.svg' },
  { courseId: 'c2', title: 'Using a tablet', description: 'y', categoryId: 'cat-d', price: 9.99, totalTopics: 2, estimatedHours: 1 },
];

beforeEach(() => {
  api.categories.mockResolvedValue({ data: CATS });
  api.list.mockResolvedValue({ data: COURSES, pagination: { page: 1, limit: 12, total: 2, totalPages: 1 } });
});

describe('CatalogPage', () => {
  it('renders cards in their subject worlds with plain-language length and price', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: 'Walking well' })).toHaveAttribute('href', '/courses/c1');
    expect(document.querySelector('[data-course-cover="c1"]')).toHaveAttribute('data-world', 'health');
    expect(document.querySelector('[data-course-cover="c2"]')).toHaveAttribute('data-world', 'digital');
    expect(screen.getByText('5 lessons · About 3 hours')).toBeInTheDocument();
    expect(screen.getAllByText('Free').length).toBeGreaterThan(0);
    expect(screen.getByText('Showing 2 courses of 2')).toBeInTheDocument();
  });

  it('asks the server to filter when a subject chip is pressed', async () => {
    renderPage();
    await screen.findByRole('link', { name: 'Walking well' });
    await userEvent.click(screen.getByRole('button', { name: 'Digital Skills' }));
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: 'cat-d' })));
  });

  it('sends typed search to the server after a pause', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    await screen.findByRole('link', { name: 'Walking well' });
    await userEvent.type(screen.getByLabelText('Search courses'), 'walk');
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'walk' })), { timeout: 2000 });
    vi.useRealTimers();
  });

  it('shows an empty state with a way to clear filters', async () => {
    api.list.mockResolvedValue({ data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } });
    renderPage('/courses?q=zzz');
    expect(await screen.findByText('No courses match those filters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });
});
