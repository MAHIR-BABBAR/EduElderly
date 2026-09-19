import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  Eye,
  HeartHandshake,
  ListOrdered,
  ShieldCheck,
  Type,
} from 'lucide-react';
import { courseApi, statsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { usePageTitle } from '@/components/layout/RouteChange';
import { Hero3D } from '@/components/landing/Hero3D';
import { LearningPreview } from '@/components/landing/LearningPreview';
import { Testimonials } from '@/components/landing/Testimonials';
import { SectionBand } from '@/components/layout/SectionBand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CourseCover } from '@/components/ui/course-cover';
import { Badge } from '@/components/ui/badge';
import { StatTile } from '@/components/ui/stat-tile';
import { CourseCardSkeleton, StatTileSkeleton } from '@/components/ui/skeleton';
import { fadeUp, heroReveal, heroStagger, inViewOnce, listStagger } from '@/lib/motion';
import { formatPrice } from '@/lib/utils';

const PROMISES = [
  { icon: Type, title: 'Text you can read', body: 'Four text sizes, set once in your settings and used everywhere.' },
  { icon: Eye, title: 'Contrast you control', body: 'A high-contrast mode for tired eyes and bright rooms.' },
  { icon: ListOrdered, title: 'One step at a time', body: 'Short lessons in a clear order. Your place is always saved.' },
  { icon: HeartHandshake, title: 'No rush, ever', body: 'No timers, no streaks, no penalties for taking a break.' },
];

const STEPS = [
  { n: '1', title: 'Create your account', body: 'Your email and a password. We send a code to confirm it is you.' },
  { n: '2', title: 'Pick a course', body: 'Health, digital skills, and lifelong learning. Most are free.' },
  { n: '3', title: 'Learn and earn', body: 'Finish the lessons, pass the quizzes, and download your certificate.' },
];

const TESTIMONIALS = [
  {
    quote: 'The large text and clear buttons made it easy for me to follow every lesson.',
    name: 'Margaret R.',
    age: 72,
    course: 'Healthy Living for Older Adults',
  },
  {
    quote: 'I finally feel confident using the internet, and I did it at my own speed.',
    name: 'James T.',
    age: 68,
    course: 'Discover Digital Health',
  },
  {
    quote: 'No rushing, no confusion. I printed my certificate and showed my grandchildren.',
    name: 'Elena V.',
    age: 75,
    course: 'Nutrition and Healthy Aging',
  },
];

const FALLBACK_CATEGORIES = [
  { categoryId: 'health-wellness', name: 'Health & Wellness' },
  { categoryId: 'digital-skills', name: 'Digital Skills' },
  { categoryId: 'life-learning', name: 'Life & Learning' },
];

function Reveal({ children, className }) {
  return (
    <motion.div
      variants={fadeUp()}
      initial="hidden"
      whileInView="visible"
      viewport={inViewOnce}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  usePageTitle('Learning made welcoming');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const coursesQuery = useQuery({ queryKey: ['courses'], queryFn: () => courseApi.list() });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: () => courseApi.listCategories() });
  const statsQuery = useQuery({ queryKey: ['public-stats'], queryFn: () => statsApi.get(), staleTime: 300_000 });

  const featured = (coursesQuery.data?.data || []).slice(0, 3);
  const categories = categoriesQuery.data?.data?.length ? categoriesQuery.data.data : FALLBACK_CATEGORIES;
  const stats = statsQuery.data?.data;

  return (
    <>
      {/* ---- Immersive zone: the only place with a long entrance ---------- */}
      <section className="relative isolate min-h-[min(88vh,44rem)] overflow-hidden">
        <Hero3D />
        {/* Scrim so the headline keeps AA contrast over any frame of the scene. */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-hero/95 via-brand-hero/70 to-transparent" />

        <div className="relative z-10 flex min-h-[min(88vh,44rem)] items-center">
          <motion.div
            variants={heroStagger()}
            initial="hidden"
            animate="visible"
            className="mx-auto w-full max-w-content px-4 py-16 sm:px-6 lg:px-8"
          >
            <div className="max-w-2xl text-white">
              <motion.p
                variants={heroReveal()}
                className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-brand-accent ring-1 ring-inset ring-white/20"
              >
                Elderly-first learning
              </motion.p>

              <motion.h1
                variants={heroReveal()}
                className="font-display text-display text-white"
              >
                Learning made welcoming
              </motion.h1>

              <motion.p variants={heroReveal()} className="mt-6 text-lg text-white/90">
                Short lessons, large text, and clear steps. Study health, digital skills, and more at
                whatever pace feels right, and earn a certificate you can share.
              </motion.p>

              <motion.div variants={heroReveal()} className="mt-9 flex flex-wrap gap-4">
                <Button asChild size="lg" variant="accent">
                  <Link to="/courses">
                    Browse courses
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline-inverse">
                  <Link to={isAuthenticated ? '/dashboard' : '/register'}>
                    {isAuthenticated ? 'Go to My Learning' : 'Create a free account'}
                  </Link>
                </Button>
              </motion.div>

              <motion.p variants={heroReveal()} className="mt-6 flex items-center gap-2 text-sm text-white/75">
                <ShieldCheck className="h-5 w-5 text-brand-accent" aria-hidden="true" />
                Free to join. No card needed for free courses.
              </motion.p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---- Calm zone from here down ------------------------------------ */}
      <SectionBand variant="white">
        <Reveal>
          <h2 className="text-center font-display text-2xl text-brand-primary-dark">
            Built around how you actually learn
          </h2>
        </Reveal>
        <motion.div
          variants={listStagger()}
          initial="hidden"
          whileInView="visible"
          viewport={inViewOnce}
          className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <motion.div key={title} variants={fadeUp()} className="text-center sm:text-left">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-brand-primary-soft sm:mx-0">
                <Icon className="h-7 w-7 text-brand-primary" aria-hidden="true" />
              </span>
              <h3 className="font-display text-lg text-brand-primary-dark">{title}</h3>
              <p className="mt-1.5 text-brand-muted">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </SectionBand>

      <SectionBand variant="default">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-2xl text-brand-primary-dark">A lesson screen with nothing in the way</h2>
            <p className="mt-4 text-lg text-brand-muted">
              One lesson at a time, with the list of what is done and what is next always in view.
              Mark a lesson complete and the next one opens. Stop whenever you like: your place is
              saved automatically.
            </p>
            <ul className="mt-6 space-y-3">
              {['Large, high-contrast controls', 'Your progress saved on every step', 'Captions noted on every video lesson'].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-success" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-8">
              <Link to="/courses">See what you can learn</Link>
            </Button>
          </Reveal>
          <Reveal>
            <LearningPreview />
          </Reveal>
        </div>
      </SectionBand>

      <SectionBand variant="white">
        <Reveal>
          <h2 className="mb-8 font-display text-2xl text-brand-primary-dark">Popular right now</h2>
        </Reveal>

        {coursesQuery.isLoading ? (
          <div className="grid gap-6 md:grid-cols-3" role="status" aria-label="Loading courses">
            {[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}
          </div>
        ) : (
          <motion.div
            variants={listStagger(0.08)}
            initial="hidden"
            whileInView="visible"
            viewport={inViewOnce}
            className="grid gap-6 md:grid-cols-3"
          >
            {featured.map((course) => (
              <motion.div key={course.courseId} variants={fadeUp()}>
                <Card interactive className="flex h-full flex-col p-0">
                  <CourseCover
                    title={course.title}
                    courseId={course.courseId}
                    src={course.thumbnailUrl}
                    className="rounded-b-none"
                  />
                  <div className="flex flex-1 flex-col p-6">
                    <CardHeader className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge className="capitalize">{course.difficulty}</Badge>
                        <Badge variant="outline">{formatPrice(course.price)}</Badge>
                      </div>
                      <CardTitle>
                        {/* Stretched link: the whole card is the target, but the
                            accessible name stays the course title. */}
                        <Link to={`/courses/${course.courseId}`} className="after:absolute after:inset-0">
                          {course.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto pt-2 text-sm text-brand-muted">
                      {course.totalTopics} lessons · about {course.estimatedHours} hours
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          {categories.map((category) => (
            <Button key={category.categoryId} variant="outline" asChild>
              <Link to={`/courses?category=${category.categoryId}`}>{category.name}</Link>
            </Button>
          ))}
        </div>
      </SectionBand>

      <SectionBand variant="default">
        <Reveal>
          <h2 className="mb-10 text-center font-display text-2xl text-brand-primary-dark">How it works</h2>
        </Reveal>
        <motion.ol
          variants={listStagger(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={inViewOnce}
          className="grid gap-8 md:grid-cols-3"
        >
          {STEPS.map(({ n, title, body }) => (
            <motion.li key={n} variants={fadeUp()} className="text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary font-display text-xl text-white">
                {n}
              </span>
              <h3 className="font-display text-lg text-brand-primary-dark">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-brand-muted">{body}</p>
            </motion.li>
          ))}
        </motion.ol>
      </SectionBand>

      <SectionBand variant="white">
        <Reveal>
          <h2 className="mb-8 text-center font-display text-2xl text-brand-primary-dark">
            Learners are already here
          </h2>
        </Reveal>
        <div className="mx-auto mb-10 grid max-w-3xl gap-4 sm:grid-cols-3">
          {statsQuery.isLoading ? (
            [0, 1, 2].map((i) => <StatTileSkeleton key={i} />)
          ) : (
            <>
              <StatTile label="Learners" value={stats?.learners ?? 0} icon={HeartHandshake} />
              <StatTile label="Courses" value={stats?.courses ?? 0} icon={ListOrdered} tone="accent" />
              <StatTile label="Certificates earned" value={stats?.certificates ?? 0} icon={Award} tone="success" />
            </>
          )}
        </div>
        <Testimonials items={TESTIMONIALS} />
      </SectionBand>

      {!isAuthenticated && (
        <SectionBand variant="accent" className="text-center">
          <Reveal>
            <h2 className="font-display text-2xl text-brand-primary-dark">Ready to start learning?</h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-muted">
              Join free today. You can change the text size or turn on high contrast at any time,
              and nothing expires.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/register">
                Create your free account
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
          </Reveal>
        </SectionBand>
      )}
    </>
  );
}
