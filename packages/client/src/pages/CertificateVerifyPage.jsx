import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { certificateApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePageTitle } from '@/components/layout/RouteChange';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';

export function CertificateVerifyPage() {
  usePageTitle('Verify a certificate');
  const [searchParams] = useSearchParams();
  const [certId, setCertId] = useState(searchParams.get('certId') || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const param = searchParams.get('certId');
    if (param) setCertId(param);
  }, [searchParams]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await certificateApi.verify(certId.trim());
      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Certificate could not be verified.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container flex justify-center py-12">
      <div className="w-full max-w-lg">
        <header className="mb-6">
          <h1 className="font-display text-2xl text-brand-primary-dark">Verify a certificate</h1>
          <p className="mt-2 text-brand-muted">
            Enter the certificate ID printed on the document. Anyone can check a certificate here;
            no account is needed.
          </p>
        </header>
        <Card>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-5">
            <FormField label="Certificate ID" htmlFor="certId">
              <Input
                id="certId"
                value={certId}
                onChange={(e) => setCertId(e.target.value)}
                required
                placeholder="e.g. CERT-XXXX"
              />
            </FormField>
            {error && <Alert variant="error">{error}</Alert>}
            {result && (
              <Alert variant={result.valid ? 'success' : 'warning'}>
                <p className="font-semibold">{result.valid ? 'Valid certificate' : 'Invalid certificate'}</p>
                {result.userName && <p>Recipient: {result.userName}</p>}
                {result.courseTitle && <p>Course: {result.courseTitle}</p>}
                {result.issuedAt && <p>Issued: {new Date(result.issuedAt).toLocaleDateString()}</p>}
              </Alert>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify certificate'}
            </Button>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
