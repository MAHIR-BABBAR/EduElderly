import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, Check, Copy, Download, ShieldCheck } from 'lucide-react';
import { certificateApi, getAccessToken } from '@/lib/api';
import { relativeDay } from '@/lib/format';
import { celebrate, fadeUp, listStagger } from '@/lib/motion';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
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

/**
 * Certificates (plan S-7): each award is a showcase card — a gold-edged
 * frame with a quiet foil sheen (CSS only), the course title in Fraunces,
 * the learner's name, date and id — with Download and Copy-verify-link.
 * Arriving fresh from a completion (router state) earns the one
 * celebration; otherwise the page is still.
 */
export function CertificatesPage() {
  const location = useLocation();
  const toasts = useToast();
  const justEarned = Boolean(location.state?.justEarned);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['my-certificates'], queryFn: () => certificateApi.listMine() });
  const certificates = data?.data ?? [];

  return (
    <div className="page-container pb-24 md:pb-12">
      <PageHeader
        eyebrow="Achievements"
        title={
          <>
            My <span className="accent-word">certificates</span>
          </>
        }
        documentTitle="My certificates"
        description="Finish every lesson and pass the quiz in a course, and your certificate appears here — ready to download or share."
      />

      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2" role="status" aria-label="Loading certificates">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {error && (
        <Alert variant="error">
          We could not load your certificates.{' '}
          <button type="button" className="font-semibold underline" onClick={() => refetch()}>Try again</button>
        </Alert>
      )}

      {!isLoading && !error && certificates.length === 0 && (
        <EmptyState
          icon={Award}
          title="Your first certificate is waiting"
          description="Finish a course and pass its quiz. It usually takes an afternoon or two — at your own pace."
          actionLabel="Browse courses"
          actionHref="/courses"
        />
      )}

      {certificates.length > 0 && (
        <motion.ul variants={listStagger(0.06)} initial="hidden" animate="visible" className="grid gap-6 lg:grid-cols-2">
          {certificates.map((cert, i) => (
            <motion.li key={cert.certId} variants={justEarned && i === 0 ? undefined : fadeUp()} {...(justEarned && i === 0 ? celebrate() : {})} className="list-none">
              <CertificateCard cert={cert} onCopy={(ok) => (ok ? toasts.success('Verification link copied') : toasts.error('Could not copy the link'))} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}

function CertificateCard({ cert, onCopy }) {
  const [copied, setCopied] = useState(false);
  const pending = cert.pdfStatus && cert.pdfStatus !== 'ready';
  const verifyPath = `/verify-certificate?certId=${encodeURIComponent(cert.certId)}`;
  const verifyUrl = `${window.location.origin}${verifyPath}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      onCopy(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onCopy(false);
    }
  };

  return (
    <article className="certificate-card relative overflow-hidden rounded-xl border border-brand-border bg-brand-surface-raised p-1 shadow-lift">
      {/* Gold-edged frame with a static foil sheen; decorative. */}
      <div aria-hidden="true" className="absolute inset-0 rounded-xl bg-[linear-gradient(135deg,rgba(233,162,59,.35),rgba(255,210,122,.08)_40%,rgba(233,162,59,.3)_70%,rgba(255,240,200,.15))]" />
      <div className="relative rounded-[calc(var(--radius-xl)-4px)] border border-brand-accent/40 bg-brand-surface-raised p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent-soft">
            <Award className="h-6 w-6 text-brand-accent-ink" aria-hidden="true" />
          </span>
          <Badge variant={pending ? 'warning' : 'success'}>
            {pending ? 'Preparing PDF' : <><ShieldCheck className="h-4 w-4" aria-hidden="true" />Verified</>}
          </Badge>
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.08em] text-brand-muted">Certificate of completion</p>
        <h2 className="mt-1 font-display text-2xl text-brand-primary-dark">{cert.courseTitle}</h2>
        <p className="mt-2 text-brand-text">
          Awarded to <span className="font-semibold">{cert.userName}</span>
        </p>
        <p className="mt-1 text-sm text-brand-muted">
          Issued {formatDate(cert.issuedAt)} ({relativeDay(cert.issuedAt)}) · ID <span className="tabular">{cert.certId}</span>
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => downloadCert(cert.certId, cert.courseTitle).catch(() => onCopy(false))} disabled={pending}>
            <Download className="h-5 w-5" aria-hidden="true" />
            {pending ? 'PDF coming shortly' : 'Download PDF'}
          </Button>
          <Button variant="outline" size="lg" onClick={copy}>
            {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy verify link'}
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to={verifyPath}>Open verify page</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
