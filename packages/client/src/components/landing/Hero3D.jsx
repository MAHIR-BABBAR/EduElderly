import { lazy, Suspense, useState } from 'react';
import { canUseWebGL } from '@/lib/utils';
import { HeroFallback } from './HeroFallback';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';

const Hero3DCanvas = lazy(() =>
  import('./Hero3DScene').then((m) => ({ default: m.Hero3DCanvas })),
);

export function Hero3D() {
  // Decided once at mount; WebGL support does not change during a session.
  const [use3d] = useState(() => canUseWebGL());

  if (!use3d) {
    return <HeroFallback />;
  }

  return (
    <WebGLErrorBoundary fallback={<HeroFallback />}>
      <Suspense fallback={<HeroFallback />}>
        <Hero3DCanvas />
      </Suspense>
    </WebGLErrorBoundary>
  );
}
