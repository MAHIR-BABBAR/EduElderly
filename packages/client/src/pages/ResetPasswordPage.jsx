import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { AuthCard } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match. Please try again.');
      return;
    }
    if (!token) {
      setError('Reset link is invalid. Please request a new link.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      navigate('/login', { state: { message: 'Password updated. You can sign in now.' } });
    } catch (err) {
      setError(err.message || 'Could not reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Choose a new password"
      description="Enter a new password for your account."
    >
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && <Alert variant="error">{error}</Alert>}
            <FormField label="New password" htmlFor="password" hint="At least 8 characters.">
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormField>
            <FormField label="Confirm password" htmlFor="confirm">
              <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </FormField>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Saving…' : 'Update password'}
            </Button>
            <p className="text-center">
              <Link to="/login" className="text-brand-primary underline">Back to sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthCard>
  );
}
