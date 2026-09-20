import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Award, Check, ClipboardList, RotateCcw, Sparkles, X } from 'lucide-react';
import { courseApi, quizApi } from '@/lib/api';
import { useCourseWorld } from '@/hooks/useCategories';
import { plural } from '@/lib/format';
import { celebrate, deckSlide } from '@/lib/motion';
import { usePageTitle } from '@/components/layout/RouteChange';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Stepper } from '@/components/ui/stepper';
import { AnswerTile } from '@/components/ui/answer-tile';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Meter } from '@/components/ui/meter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const LETTERS = 'ABCDEFGH';

/**
 * Quiz (plan S-5): one question per screen on a stepper, questions sliding
 * like cards in a deck (spatial tier), answers as large tiles, then a
 * result with a score ring and a per-question review that says "Correct" /
 * "Your answer" in words. Exactly one answer per question is sent — the
 * server rejects anything else.
 */
export function QuizPage() {
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [result, setResult] = useState(null);
  const questionRef = useRef(null);

  const courseQuery = useQuery({ queryKey: ['course', courseId], queryFn: () => courseApi.getById(courseId) });
  const listQuery = useQuery({ queryKey: ['quizzes', courseId], queryFn: () => quizApi.getByCourse(courseId) });
  const attemptsQuery = useQuery({ queryKey: ['my-quiz-attempts'], queryFn: () => quizApi.myAttempts() });
  const course = courseQuery.data?.data;
  const { world } = useCourseWorld(course);

  const quizzes = listQuery.data?.data ?? [];
  const attempts = attemptsQuery.data?.data?.attempts ?? [];
  const activeQuizId = params.get('quizId') || quizzes[0]?.quizId;
  const quizQuery = useQuery({ queryKey: ['quiz', activeQuizId], queryFn: () => quizApi.getById(activeQuizId), enabled: Boolean(activeQuizId) });
  const quiz = quizQuery.data?.data;
  const questions = quiz?.questions ?? [];
  const question = questions[step];
  const attemptsForQuiz = attempts.filter((a) => a.quizId === activeQuizId);
  const alreadyPassed = attemptsForQuiz.some((a) => a.passed);
  const attemptsLeft = quiz ? Math.max(0, (quiz.maxAttempts ?? 0) - attemptsForQuiz.length) : null;
  const outOfAttempts = quiz && quiz.maxAttempts > 0 && attemptsLeft === 0 && !alreadyPassed;

  usePageTitle(quiz ? `${quiz.title} · Quiz` : 'Quiz');

  useEffect(() => {
    questionRef.current?.focus({ preventScroll: true });
  }, [step, activeQuizId]);

  const submitMutation = useMutation({
    mutationFn: () =>
      quizApi.submitAttempt(
        activeQuizId,
        // One entry per question, in question order — never duplicates.
        questions.map((q) => ({ questionId: q.questionId, selectedIndex: Number(answers[q.questionId]) })),
      ),
    onSuccess: (res) => {
      setResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['my-quiz-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['my-certificates'] });
    },
  });

  const go = (delta) => {
    setDirection(delta);
    setStep((s) => Math.min(questions.length - 1, Math.max(0, s + delta)));
  };
  const restart = () => {
    setAnswers({});
    setStep(0);
    setDirection(1);
    setResult(null);
  };
  const chooseQuiz = (quizId) => {
    setParams({ quizId }, { replace: true });
    restart();
  };

  const isLoading = listQuery.isLoading || (activeQuizId && quizQuery.isLoading);
  const courseTitle = course?.title ?? 'Course';

  return (
    <div className="page-container max-w-4xl pb-24 md:pb-12" data-world={world}>
      <Breadcrumbs items={[{ label: 'My learning', href: '/dashboard' }, { label: courseTitle, href: `/courses/${courseId}` }, { label: 'Quiz' }]} />

      {isLoading && (
        <div className="mt-6 space-y-4" role="status" aria-label="Loading quiz">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {listQuery.error && <Alert variant="error" className="mt-6">We could not load the quiz. Please try again.</Alert>}

      {!isLoading && !listQuery.error && quizzes.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={ClipboardList} title="This course has no quiz" description="Finish the lessons and your certificate will be issued without one." actionLabel="Back to my learning" actionHref="/dashboard" />
        </div>
      )}

      {quiz && !isLoading && (
        <>
          <header className="mt-4 mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-accent-ink">{courseTitle}</p>
            <h1 className="mt-1 font-display text-3xl text-brand-primary-dark" tabIndex={-1}>
              {quiz.title}
            </h1>
            {quizzes.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quizzes in this course">
                {quizzes.map((q) => {
                  const passed = attempts.some((a) => a.quizId === q.quizId && a.passed);
                  return (
                    <Button key={q.quizId} variant={q.quizId === activeQuizId ? 'default' : 'outline'} size="sm" onClick={() => chooseQuiz(q.quizId)}>
                      {passed && <Check className="h-4 w-4" aria-hidden="true" />}
                      {q.title}
                    </Button>
                  );
                })}
              </div>
            )}
          </header>

          {result ? (
            <ResultPanel result={result} questions={questions} answers={answers} quiz={quiz} attemptsLeft={attemptsLeft != null ? attemptsLeft - 1 : null} onRetry={restart} />
          ) : outOfAttempts ? (
            <Alert variant="warning">
              You have used all {plural(quiz.maxAttempts, 'attempt')} for this quiz. Review the lessons, then ask for help if you would like another go.
            </Alert>
          ) : questions.length === 0 ? (
            <Alert variant="info">This quiz has no questions yet.</Alert>
          ) : (
            <>
              {alreadyPassed && (
                <Alert variant="success" className="mb-4">
                  You have already passed this quiz — you can take it again for practice.
                </Alert>
              )}
              <div className="hidden sm:block">
                <Stepper steps={questions.map((_, i) => `Question ${i + 1}`)} current={step} onStepClick={(i) => { setDirection(i > step ? 1 : -1); setStep(i); }} label="Questions" />
              </div>
              <div className="sm:hidden">
                <Meter value={step + 1} max={questions.length} noun="question" label="Question" />
              </div>

              <div className="relative mt-6 overflow-hidden">
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.section
                    key={question.questionId}
                    {...deckSlide(direction)}
                    aria-labelledby={`q-${question.questionId}`}
                    className="rounded-xl border border-brand-border bg-brand-surface-raised p-6 shadow-card sm:p-8"
                  >
                    <fieldset className="m-0 min-w-0 border-0 p-0">
                      <legend className="sr-only">Question {step + 1} of {questions.length}</legend>
                      <p className="text-sm font-semibold text-brand-muted">Question {step + 1} of {questions.length}</p>
                      <h2 id={`q-${question.questionId}`} ref={questionRef} tabIndex={-1} className="mt-2 font-display text-2xl text-brand-text focus-visible:outline-none">
                        {question.text ?? question.question ?? question.prompt}
                      </h2>
                      <div className="mt-6 grid gap-3">
                        {question.options.map((option, i) => (
                          <AnswerTile
                            key={i}
                            letter={LETTERS[i]}
                            name={`q-${question.questionId}`}
                            value={i}
                            selected={answers[question.questionId] === i}
                            onSelect={() => setAnswers((a) => ({ ...a, [question.questionId]: i }))}
                          >
                            {typeof option === 'string' ? option : option.text}
                          </AnswerTile>
                        ))}
                      </div>
                    </fieldset>
                  </motion.section>
                </AnimatePresence>
              </div>

              {submitMutation.error && <Alert variant="error" className="mt-4">{submitMutation.error.message}</Alert>}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" size="lg" onClick={() => go(-1)} disabled={step === 0}>
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                  Back
                </Button>
                {step < questions.length - 1 ? (
                  <Button size="lg" className="min-h-touch-primary" onClick={() => go(1)} disabled={answers[question.questionId] === undefined}>
                    Next
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="min-h-touch-primary"
                    onClick={() => submitMutation.mutate()}
                    disabled={!questions.every((q) => answers[q.questionId] !== undefined)}
                    loading={submitMutation.isPending}
                    loadingLabel="Checking…"
                  >
                    See my result
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </Button>
                )}
              </div>
              <p className="mt-3 text-sm text-brand-muted">
                You need {quiz.passThreshold}% to pass{quiz.maxAttempts > 0 ? ` · ${plural(attemptsLeft, 'attempt')} left` : ''}. Take your time — there is no clock.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ResultPanel({ result, questions, answers, quiz, attemptsLeft, onRetry }) {
  const feedback = new Map((result.questionFeedback ?? []).map((f) => [f.questionId, f.correct]));
  const correct = [...feedback.values()].filter(Boolean).length;
  const passed = result.passed;

  return (
    <motion.section {...celebrate()} aria-labelledby="result-heading" className="rounded-xl border border-brand-border bg-brand-surface-raised p-6 shadow-lift sm:p-8">
      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <ProgressRing value={result.score} size={132} strokeWidth={12} label="Your score" />
        <div>
          <Badge variant={passed ? 'success' : 'warning'} className="mb-2">
            {passed ? <Check className="h-4 w-4" aria-hidden="true" strokeWidth={3} /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
            {passed ? 'Passed' : 'Not yet'}
          </Badge>
          <h2 id="result-heading" className="font-display text-3xl text-brand-primary-dark" tabIndex={-1}>
            {passed ? (
              <>Well <span className="accent-word">done</span>.</>
            ) : (
              <>Nearly <span className="accent-word">there</span>.</>
            )}
          </h2>
          <p className="mt-2 text-lg text-brand-muted">
            You answered {correct} of {plural(questions.length, 'question')} correctly ({result.score}%).{' '}
            {passed ? 'Pass every quiz in the course and your certificate is issued.' : `You need ${quiz.passThreshold}% — the lessons are always there to look at again.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {passed ? (
              <Button asChild size="lg" className="min-h-touch-primary">
                <Link to="/dashboard">
                  <Award className="h-5 w-5" aria-hidden="true" />
                  Back to my learning
                </Link>
              </Button>
            ) : attemptsLeft == null || attemptsLeft > 0 ? (
              <Button size="lg" className="min-h-touch-primary" onClick={onRetry}>
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
                Try again
              </Button>
            ) : null}
            <Button asChild variant="outline" size="lg">
              <Link to="/dashboard">My learning</Link>
            </Button>
          </div>
        </div>
      </div>

      <h3 className="mt-8 font-display text-xl text-brand-primary-dark">Your answers</h3>
      <ol className="mt-3 grid gap-3">
        {questions.map((q, i) => {
          const ok = feedback.get(q.questionId);
          const chosen = answers[q.questionId];
          return (
            <li key={q.questionId} className="flex items-start gap-3 rounded-lg border border-brand-border p-4">
              <span aria-hidden="true" className={ok ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-success text-white' : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-danger text-white'}>
                {ok ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-brand-text">{i + 1}. {q.text ?? q.question ?? q.prompt}</p>
                <p className={ok ? 'mt-1 text-sm font-semibold text-brand-success' : 'mt-1 text-sm font-semibold text-brand-danger'}>
                  {ok ? 'Correct' : 'Not quite'} · your answer: {LETTERS[chosen]}. {typeof q.options[chosen] === 'string' ? q.options[chosen] : q.options[chosen]?.text}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </motion.section>
  );
}
