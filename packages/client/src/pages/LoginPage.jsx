import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { AuthCard } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginSuccess = useAuthStore((s) => s.loginSuccess);
  const setPendingOtpEmail = useAuthStore((s) => s.setPendingOtpEmail);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || '/dashboard';
  const flashMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.requiresOtp) {
        setPendingOtpEmail(email, res.otpToken);
        navigate('/verify-otp', { state: { from } });
        return;
      }
      await loginSuccess(res.data.accessToken, res.data.user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue your learning journey."
    >
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {flashMessage && <Alert variant="success">{flashMessage}</Alert>}
            {error && <Alert variant="error">{error}</Alert>}
            <FormField label="Email address" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormField>
            <FormField label="Password" htmlFor="password">
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormField>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="text-center text-brand-muted">
              <Link to="/forgot-password" className="underline hover:text-brand-primary">Forgot your password?</Link>
            </p>
            <p className="text-center text-brand-muted">
              New here? <Link to="/register" className="font-semibold text-brand-primary underline">Create an account</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthCard>
  );
}
