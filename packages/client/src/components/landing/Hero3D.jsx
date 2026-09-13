import { lazy, Suspense, useEffect, useState } from 'react';
import { canUseWebGL } from '@/lib/utils';
import { HeroFallback } from './HeroFallback';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';

const Hero3DCanvas = lazy(() =>
  import('./Hero3DScene').then((m) => ({ default: m.Hero3DCanvas })),
);

export function Hero3D() {
  const [use3d, setUse3d] = useState(false);

  useEffect(() => {
    setUse3d(canUseWebGL());
  }, []);

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
