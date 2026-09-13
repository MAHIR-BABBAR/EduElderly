import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizApi } from '@/lib/api';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function QuizPage() {
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState({});
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const listQuery = useQuery({
    queryKey: ['quizzes', courseId],
    queryFn: () => quizApi.getByCourse(courseId),
  });

  const attemptsQuery = useQuery({
    queryKey: ['my-quiz-attempts'],
    queryFn: () => quizApi.myAttempts(),
  });

  const quizzes = listQuery.data?.data || [];
  const attempts = attemptsQuery.data?.data?.attempts || [];
  const passedQuizIds = new Set(
    attempts.filter((a) => a.passed).map((a) => a.quizId),
  );

  const activeQuizId = searchParams.get('quizId') || quizzes[0]?.quizId;

  const quizQuery = useQuery({
    queryKey: ['quiz', activeQuizId],
    queryFn: () => quizApi.getById(activeQuizId),
    enabled: Boolean(activeQuizId),
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const answers = Object.entries(selected).map(([questionId, selectedIndex]) => ({
        questionId,
        selectedIndex: Number(selectedIndex),
      }));
      return quizApi.submitAttempt(activeQuizId, answers);
    },
    onSuccess: (res) => {
      setConfirmOpen(false);
      setResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['my-quiz-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['my-certificates'] });
    },
  });

  const quiz = quizQuery.data?.data;
  const questions = quiz?.questions || [];

  const handleSelect = (questionId, index) => {
    setSelected((prev) => ({ ...prev, [questionId]: index }));
  };

  const allAnswered = questions.length > 0 && questions.every((q) => selected[q.questionId] !== undefined);

  const selectQuiz = (quizId) => {
    setSearchParams({ quizId });
    setSelected({});
    setResult(null);
  };

  if (listQuery.isLoading) {
    return <div className="page-container"><p role="status">Loading quizzes…</p></div>;
  }

  if (quizzes.length === 0) {
    return (
      <div className="page-container">
        <Card>
          <CardHeader>
            <CardTitle>No quizzes available</CardTitle>
            <CardDescription>Complete more lessons or check back later.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="page-container max-w-2xl">
        <Breadcrumbs
          items={[
            { label: 'My Learning', href: '/dashboard' },
            { label: quiz?.title || 'Quiz' },
          ]}
        />
        <Card className={cn('mt-6', result.passed ? 'border-brand-success' : 'border-brand-warning')}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>{result.passed ? 'Well done!' : 'Keep learning'}</CardTitle>
              <Badge variant={result.passed ? 'success' : 'warning'}>
                {result.passed ? 'Passed' : 'Not yet passed'}
              </Badge>
            </div>
            <CardDescription>
              {result.passed
                ? `You scored ${result.score}%. Pass every quiz in this course to earn your certificate.`
                : `You scored ${result.score}%. Review the lessons and try again when you are ready.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button onClick={() => { setResult(null); setSelected({}); }}>
              Back to quiz list
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard">My Learning</Link>
            </Button>
            {!result.passed && (
              <Button variant="outline" onClick={() => setResult(null)}>
                Try again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeQuizId || quizQuery.isLoading) {
    return <div className="page-container"><p role="status">Loading quiz…</p></div>;
  }

  if (!quiz) {
    return (
      <div className="page-container">
        <Alert variant="error">Quiz could not be loaded.</Alert>
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl">
      <Breadcrumbs
        items={[
          { label: 'My Learning', href: '/dashboard' },
          { label: 'Quizzes' },
        ]}
      />

      <section className="mb-8 mt-4" aria-labelledby="quiz-list-heading">
        <h2 id="quiz-list-heading" className="mb-4 text-[length:var(--font-size-xl)] font-semibold">
          Course quizzes
        </h2>
        <ul className="space-y-3">
          {quizzes.map((q) => {
            const passed = passedQuizIds.has(q.quizId);
            const isActive = q.quizId === activeQuizId;
            return (
              <li key={q.quizId}>
                <button
                  type="button"
                  onClick={() => selectQuiz(q.quizId)}
                  className={cn(
                    'flex w-full min-h-touch items-center justify-between rounded-lg border-2 p-4 text-left transition-colors',
                    isActive ? 'border-brand-primary bg-brand-accent-soft' : 'border-brand-border hover:border-brand-primary/50',
                  )}
                >
                  <span className="font-semibold">{q.title}</span>
                  <Badge variant={passed ? 'success' : 'warning'}>
                    {passed ? 'Passed' : 'Not passed'}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <header className="mb-6">
        <h1 className="text-[length:var(--font-size-2xl)]">{quiz.title}</h1>
        <p className="text-brand-muted">Pass threshold: {quiz.passThreshold}%</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (allAnswered) setConfirmOpen(true);
        }}
        className="space-y-6"
      >
        {questions.map((question, qi) => (
          <Card key={question.questionId}>
            <CardHeader>
              <CardTitle className="text-[length:var(--font-size-lg)]">
                Question {qi + 1} of {questions.length}: {question.prompt}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <fieldset>
                <legend className="sr-only">Choose an answer for question {qi + 1}</legend>
                <div className="space-y-3">
                  {question.options.map((option, oi) => {
                    const id = `${question.questionId}-${oi}`;
                    const isSelected = selected[question.questionId] === oi;
                    return (
                      <label
                        key={id}
                        htmlFor={id}
                        className={cn(
                          'flex min-h-touch cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors',
                          isSelected
                            ? 'border-brand-primary bg-brand-accent-soft'
                            : 'border-brand-border hover:border-brand-primary/50',
                        )}
                      >
                        <input
                          type="radio"
                          id={id}
                          name={question.questionId}
                          value={oi}
                          checked={isSelected}
                          onChange={() => handleSelect(question.questionId, oi)}
                          className="h-5 w-5 accent-brand-primary"
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </CardContent>
          </Card>
        ))}

        {submitMutation.error && (
          <Alert variant="error">{submitMutation.error.message}</Alert>
        )}

        <div className="flex flex-wrap gap-4">
          <Button type="submit" size="lg" disabled={!allAnswered || submitMutation.isPending}>
            Submit answers
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/dashboard">Cancel</Link>
          </Button>
        </div>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit your answers?</DialogTitle>
            <DialogDescription>
              You answered all {questions.length} questions. Submit now? You cannot change answers after submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? 'Submitting…' : 'Yes, submit'}
            </Button>
            <Button variant="outline" size="lg" onClick={() => setConfirmOpen(false)}>
              Go back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
