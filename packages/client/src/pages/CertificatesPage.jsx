import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Award, Download, Share2 } from 'lucide-react';
import { certificateApi } from '@/lib/api';
import { getAccessToken } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function downloadCert(certId, courseTitle) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const res = await fetch(`${API_BASE}/api/v1/certificates/me/${certId}/download`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Could not download certificate.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `certificate-${courseTitle || certId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CertificatesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: () => certificateApi.listMine(),
  });

  const certificates = data?.data || [];

  return (
    <div className="page-container">
      <PageHeader
        title="My certificates"
        description="Complete all lessons and pass every quiz in a course to earn a certificate."
      />

      {isLoading && <p role="status">Loading certificates…</p>}
      {error && <Alert variant="error">{error.message}</Alert>}

      {!isLoading && !error && certificates.length === 0 && (
        <EmptyState
          icon={Award}
          title="No certificates yet"
          description="Finish every lesson and pass all quizzes in a course to earn your first certificate."
          actionLabel="Browse courses"
          actionHref="/courses"
        />
      )}

      <ul className="mt-6 grid gap-6 sm:grid-cols-2">
        {certificates.map((cert) => (
          <li key={cert.certId}>
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Award className="mt-1 h-8 w-8 shrink-0 text-brand-accent" aria-hidden="true" />
                  <div>
                    <CardTitle>{cert.courseTitle}</CardTitle>
                    <CardDescription>Issued {formatDate(cert.issuedAt)}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => downloadCert(cert.certId, cert.courseTitle).catch(() => {})}
                >
                  <Download className="mr-2 h-5 w-5" aria-hidden="true" />
                  Download PDF
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to={`/verify-certificate?certId=${cert.certId}`}>
                    <Share2 className="mr-2 h-5 w-5" aria-hidden="true" />
                    Share / verify
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
