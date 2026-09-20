import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { quizAdminApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

export function AdminQuizzesPage() {
  const [quizForm, setQuizForm] = useState({
    courseId: '',
    title: '',
    passThreshold: 70,
    maxAttempts: 3,
    isPublished: true,
  });
  const [createdQuizId, setCreatedQuizId] = useState('');
  const [questionForm, setQuestionForm] = useState({
    prompt: '',
    options: ['', '', ''],
    correctIndex: 0,
    order: 0,
  });
  const [success, setSuccess] = useState('');

  const createQuizMutation = useMutation({
    mutationFn: () => quizAdminApi.create(quizForm),
    onSuccess: (res) => {
      setCreatedQuizId(res.data?.quizId || '');
      setSuccess('Quiz created. Add questions below.');
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: () =>
      quizAdminApi.addQuestion(createdQuizId, {
        ...questionForm,
        options: questionForm.options.filter((o) => o.trim()),
      }),
    onSuccess: () => {
      setSuccess('Question added.');
      setQuestionForm({ prompt: '', options: ['', '', ''], correctIndex: 0, order: questionForm.order + 1 });
    },
  });

  return (
    <>
      <PageHeader title="Quizzes" description="Create quizzes and add questions for a course." />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Course ID" htmlFor="quiz-course" required>
            <Input
              id="quiz-course"
              value={quizForm.courseId}
              onChange={(e) => setQuizForm({ ...quizForm, courseId: e.target.value })}
              placeholder="Paste course UUID"
              required
            />
          </FormField>
          <FormField label="Quiz title" htmlFor="quiz-title" required>
            <Input
              id="quiz-title"
              value={quizForm.title}
              onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
              required
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Pass threshold (%)" htmlFor="quiz-threshold">
              <Input
                id="quiz-threshold"
                type="number"
                min="0"
                max="100"
                value={quizForm.passThreshold}
                onChange={(e) => setQuizForm({ ...quizForm, passThreshold: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Max attempts" htmlFor="quiz-attempts">
              <Input
                id="quiz-attempts"
                type="number"
                min="1"
                value={quizForm.maxAttempts}
                onChange={(e) => setQuizForm({ ...quizForm, maxAttempts: Number(e.target.value) })}
              />
            </FormField>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={quizForm.isPublished}
              onChange={(e) => setQuizForm({ ...quizForm, isPublished: e.target.checked })}
            />
            Published
          </label>
          {createQuizMutation.error && <Alert variant="error">{createQuizMutation.error.message}</Alert>}
          <Button
            onClick={() => createQuizMutation.mutate()}
            disabled={!quizForm.courseId || !quizForm.title || createQuizMutation.isPending}
          >
            Create quiz
          </Button>
          {createdQuizId && (
            <p className="text-[length:var(--font-size-sm)] text-brand-muted">Quiz ID: {createdQuizId}</p>
          )}
        </CardContent>
      </Card>

      {createdQuizId && (
        <Card>
          <CardHeader>
            <CardTitle>Add question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Question prompt" htmlFor="q-prompt" required>
              <Input
                id="q-prompt"
                value={questionForm.prompt}
                onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
                required
              />
            </FormField>
            {questionForm.options.map((opt, i) => (
              <FormField key={i} label={`Option ${i + 1}`} htmlFor={`q-opt-${i}`}>
                <Input
                  id={`q-opt-${i}`}
                  value={opt}
                  onChange={(e) => {
                    const options = [...questionForm.options];
                    options[i] = e.target.value;
                    setQuestionForm({ ...questionForm, options });
                  }}
                />
              </FormField>
            ))}
            <FormField label="Correct option (0-based index)" htmlFor="q-correct">
              <Input
                id="q-correct"
                type="number"
                min="0"
                max={questionForm.options.length - 1}
                value={questionForm.correctIndex}
                onChange={(e) => setQuestionForm({ ...questionForm, correctIndex: Number(e.target.value) })}
              />
            </FormField>
            {addQuestionMutation.error && <Alert variant="error">{addQuestionMutation.error.message}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            <Button
              onClick={() => addQuestionMutation.mutate()}
              disabled={!questionForm.prompt.trim() || addQuestionMutation.isPending}
            >
              Add question
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
