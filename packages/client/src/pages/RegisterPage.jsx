import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { AuthCard } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authApi.register(form);
      setSuccess('Account created. Please check your email to verify your address before signing in.');
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      description="Join EduElderly and start learning at your own pace."
    >
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && <Alert variant="error">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            <FormField label="Full name" htmlFor="name">
              <Input id="name" name="name" required minLength={2} value={form.name} onChange={handleChange} />
            </FormField>
            <FormField label="Email address" htmlFor="email">
              <Input id="email" name="email" type="email" required value={form.email} onChange={handleChange} />
            </FormField>
            <FormField
              label="Password"
              htmlFor="password"
              hint="At least 8 characters with letters and numbers."
            >
              <Input id="password" name="password" type="password" required minLength={8} value={form.password} onChange={handleChange} />
            </FormField>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
            <p className="text-center text-brand-muted">
              Already have an account? <Link to="/login" className="font-semibold text-brand-primary underline">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthCard>
  );
}
