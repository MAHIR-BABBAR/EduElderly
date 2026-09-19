import { lazy, Suspense, useState } from 'react';
import { canUseWebGL } from '@/lib/utils';
import { HeroFallback } from './HeroFallback';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';

// Three.js and drei are the largest dependency in the app and are needed on
// exactly one screen, so the scene is split into its own chunk and only
// requested when we know we are going to render it.
const Hero3DCanvas = lazy(() => import('./Hero3DScene').then((m) => ({ default: m.Hero3DCanvas })));

export function Hero3D() {
  // Decided once at mount. `canUseWebGL` also returns false when the viewer
  // asked for reduced motion, so that preference skips the download entirely
  // rather than loading a scene we would immediately freeze.
  const [use3d] = useState(() => canUseWebGL());

  if (!use3d) return <HeroFallback />;

  return (
    <WebGLErrorBoundary fallback={<HeroFallback />}>
      <Suspense fallback={<HeroFallback />}>
        <Hero3DCanvas />
      </Suspense>
    </WebGLErrorBoundary>
  );
}
