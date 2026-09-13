import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, ListOrdered, Type } from 'lucide-react';
import { courseApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Hero3D } from '@/components/landing/Hero3D';
import { SectionBand } from '@/components/layout/SectionBand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BlurText, GlowCard, StaggerChildren } from '@/components/marketing/motion';
import { formatPrice } from '@/lib/utils';

const TRUST_ITEMS = [
  { icon: Type, label: 'Large text', desc: 'Readable fonts you can enlarge' },
  { icon: Eye, label: 'High contrast', desc: 'Clear colors in settings' },
  { icon: ListOrdered, label: 'Step by step', desc: 'One lesson at a time' },
];

const STEPS = [
  { n: '1', title: 'Create your account', desc: 'Sign up with your email. We keep instructions simple.' },
  { n: '2', title: 'Choose a course', desc: 'Browse health, digital skills, and lifelong learning topics.' },
  { n: '3', title: 'Learn at your pace', desc: 'Watch lessons, mark progress, and earn certificates.' },
];

const TESTIMONIALS = [
  { quote: 'The large text and clear buttons made it easy for me to follow every lesson.', name: 'Margaret R.', age: '72' },
  { quote: 'I finally feel confident using the internet thanks to the digital skills course.', name: 'James T.', age: '68' },
  { quote: 'No rushing, no confusion — just friendly learning.', name: 'Elena V.', age: '75' },
];

const CATEGORIES_FALLBACK = [
  { id: 'health-wellness', label: 'Health & Wellness' },
  { id: 'digital-skills', label: 'Digital Skills' },
  { id: 'life-learning', label: 'Life & Learning' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useQuery({ queryKey: ['courses'], queryFn: () => courseApi.list() });
  const { data: catData } = useQuery({ queryKey: ['categories'], queryFn: () => courseApi.listCategories() });
  const featured = (data?.data || []).slice(0, 3);
  const categories = (catData?.data?.length ? catData.data : CATEGORIES_FALLBACK.map((c) => ({
    categoryId: c.id,
    name: c.label,
    slug: c.id,
  })));

  return (
    <>
      <section className="relative min-h-[85vh] overflow-hidden">
        <Hero3D />
        <div className="relative z-10 flex min-h-[85vh] items-center">
          <div className="page-container max-w-2xl text-white">
            <p className="mb-3 text-[length:var(--font-size-sm)] font-semibold uppercase tracking-widest text-brand-accent">
              Elderly-first learning
            </p>
            <h1 className="mb-6 font-display text-[length:var(--font-size-3xl)] leading-tight text-white">
              <BlurText text="Discover courses designed for your pace and comfort" />
            </h1>
            <p className="mb-8 text-[length:var(--font-size-lg)] text-white/90">
              Large text, high contrast, and clear navigation — because learning should feel welcoming at every age.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-brand-accent text-brand-primary-dark hover:bg-brand-accent/90">
                <Link to="/courses">Browse courses</Link>
              </Button>
              {isAuthenticated ? (
                <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  <Link to="/dashboard">Go to My Learning</Link>
                </Button>
              ) : (
                <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  <Link to="/register">Create free account</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <SectionBand variant="white">
        <div className="grid gap-8 md:grid-cols-3">
          {TRUST_ITEMS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex gap-4 text-center md:text-left">
              <div className="mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-accent-soft md:mx-0">
                <Icon className="h-7 w-7 text-brand-primary" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-text">{label}</h3>
                <p className="mt-1 text-brand-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionBand>

      <SectionBand variant="default">
        <h2 className="mb-8 font-display text-[length:var(--font-size-2xl)] text-brand-primary-dark">Featured courses</h2>
        <StaggerChildren className="grid gap-6 md:grid-cols-3">
          {featured.map((course) => (
            <GlowCard key={course.courseId}>
              <CardHeader>
                <Badge variant="secondary" className="mb-2 w-fit capitalize">{course.difficulty}</Badge>
                <CardTitle>{course.title}</CardTitle>
                <CardDescription className="line-clamp-2">{course.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 font-semibold text-brand-primary">{formatPrice(course.price)}</p>
                <Button className="w-full" onClick={() => navigate(`/courses/${course.courseId}`)}>
                  View course
                </Button>
              </CardContent>
            </GlowCard>
          ))}
        </StaggerChildren>
      </SectionBand>

      <SectionBand variant="accent">
        <h2 className="mb-10 text-center font-display text-[length:var(--font-size-2xl)] text-brand-primary-dark">How it works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-[length:var(--font-size-xl)] font-bold text-white">
                {step.n}
              </div>
              <h3 className="font-semibold text-brand-text">{step.title}</h3>
              <p className="mt-2 text-brand-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </SectionBand>

      <SectionBand variant="white">
        <h2 className="mb-6 font-display text-[length:var(--font-size-2xl)] text-brand-primary-dark">Explore by topic</h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => (
            <Button key={cat.categoryId || cat.slug} variant="outline" size="lg" asChild>
              <Link to={`/courses?category=${cat.categoryId || cat.slug}`}>{cat.name || cat.label}</Link>
            </Button>
          ))}
        </div>
      </SectionBand>

      <SectionBand variant="default">
        <h2 className="mb-8 text-center font-display text-[length:var(--font-size-2xl)] text-brand-primary-dark">What learners say</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name}>
              <CardContent className="pt-6">
                <p className="text-[length:var(--font-size-lg)] italic text-brand-text">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 font-semibold text-brand-primary">{t.name}, age {t.age}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionBand>

      {!isAuthenticated && (
        <SectionBand variant="accent" className="text-center">
          <h2 className="font-display text-[length:var(--font-size-2xl)] text-brand-primary-dark">Ready to start learning?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-muted">Join free today and adjust text size or contrast anytime in settings.</p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/register">Create your account</Link>
          </Button>
        </SectionBand>
      )}
    </>
  );
}
