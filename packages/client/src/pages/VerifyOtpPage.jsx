import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { AuthCard } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pendingOtpEmail = useAuthStore((s) => s.pendingOtpEmail);
  const loginSuccess = useAuthStore((s) => s.loginSuccess);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pendingOtpEmail) {
      navigate('/login');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ email: pendingOtpEmail, otp });
      await loginSuccess(res.data.accessToken, res.data.user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'That code did not work. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingOtpEmail) return;
    setMessage('');
    setError('');
    try {
      await authApi.resendOtp({ email: pendingOtpEmail });
      setMessage('A new code has been sent to your email. Take your time — it will not disappear.');
    } catch (err) {
      setError(err.message || 'Could not resend code.');
    }
  };

  return (
    <AuthCard>
      <Card>
        <CardHeader>
          <CardTitle>Enter your sign-in code</CardTitle>
          <CardDescription>
            We sent a 6-digit code to {pendingOtpEmail || 'your email'}. Enter it when you are ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && <Alert variant="error">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}
            <FormField label="6-digit code" htmlFor="otp" hint="Enter all six numbers from your email.">
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-[0.5em]"
              />
            </FormField>
            <Button type="submit" className="w-full" size="lg" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying…' : 'Verify and sign in'}
            </Button>
            <Button type="button" variant="outline" className="w-full" size="lg" onClick={handleResend}>
              Send a new code
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthCard>
  );
}
