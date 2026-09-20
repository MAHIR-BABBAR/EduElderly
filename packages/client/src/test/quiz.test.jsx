import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const api = vi.hoisted(() => ({ course: vi.fn(), byCourse: vi.fn(), attempts: vi.fn(), quiz: vi.fn(), submit: vi.fn(), categories: vi.fn() }));
vi.mock('@/lib/api', () => ({
  courseApi: { getById: api.course, listCategories: api.categories },
  quizApi: { getByCourse: api.byCourse, myAttempts: api.attempts, getById: api.quiz, submitAttempt: api.submit },
}));

import { QuizPage } from '@/pages/QuizPage';

const QUIZ = {
  data: {
    quizId: 'qz1',
    title: 'Knowledge check',
    passThreshold: 70,
    maxAttempts: 3,
    questions: [
      { questionId: 'a', prompt: 'First question?', options: ['Yes', 'No'] },
      { questionId: 'b', prompt: 'Second question?', options: ['Up', 'Down'] },
    ],
  },
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/quiz/c1']}>
        <Routes>
          <Route path="/quiz/:courseId" element={<QuizPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  api.categories.mockResolvedValue({ data: [] });
  api.course.mockResolvedValue({ data: { courseId: 'c1', title: 'Healthy Living' } });
  api.byCourse.mockResolvedValue({ data: [{ quizId: 'qz1', title: 'Knowledge check' }] });
  api.attempts.mockResolvedValue({ data: { attempts: [] } });
  api.quiz.mockResolvedValue(QUIZ);
});

describe('QuizPage', () => {
  it('shows one question at a time and only moves on once an answer is chosen', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 2, name: 'First question?' })).toBeInTheDocument();
    expect(screen.queryByText('Second question?')).toBeNull();
    const next = screen.getByRole('button', { name: /^Next/ });
    expect(next).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: /Yes/ }));
    expect(next).toBeEnabled();
    await userEvent.click(next);
    expect(await screen.findByRole('heading', { level: 2, name: 'Second question?' })).toBeInTheDocument();
  });

  it('submits exactly one answer per question, in order, then shows the result in words', async () => {
    api.submit.mockResolvedValue({ data: { score: 50, passed: false, questionFeedback: [{ questionId: 'a', correct: true }, { questionId: 'b', correct: false }] } });
    renderPage();
    await screen.findByRole('heading', { level: 2, name: 'First question?' });
    await userEvent.click(screen.getByRole('radio', { name: /Yes/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Next/ }));
    await userEvent.click(await screen.findByRole('radio', { name: /Down/ }));
    await userEvent.click(screen.getByRole('button', { name: /See my result/ }));
    await waitFor(() =>
      expect(api.submit).toHaveBeenCalledWith('qz1', [
        { questionId: 'a', selectedIndex: 0 },
        { questionId: 'b', selectedIndex: 1 },
      ]),
    );
    expect(await screen.findByRole('progressbar', { name: 'Your score' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('Not yet')).toBeInTheDocument();
    expect(screen.getByText(/Correct · your answer: A\. Yes/)).toBeInTheDocument();
    expect(screen.getByText(/Not quite · your answer: B\. Down/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });

  it('explains when the course has no quiz', async () => {
    api.byCourse.mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText('This course has no quiz')).toBeInTheDocument();
  });
});
