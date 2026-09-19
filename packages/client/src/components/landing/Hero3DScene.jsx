import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';

/**
 * Landing hero scene: lesson cards drifting upward past a certificate.
 *
 * The previous scene was abstract orbs and a torus knot, which said nothing
 * about the product. This one is a small visual metaphor — lessons rising, a
 * certificate at the end — in the brand teal and gold.
 *
 * Restraint is deliberate for this audience: slow, continuous drift, no
 * pointer parallax, no scroll coupling, nothing that jumps. Anything faster
 * reads as agitation rather than welcome, and the whole canvas is replaced by
 * a static gradient when the viewer asks for reduced motion (see Hero3D).
 */

const TEAL = '#2d8a9a';
const TEAL_DEEP = '#1b5e6b';
const GOLD = '#e8a838';
const CREAM = '#fff4e0';

function LessonCard({ position, rotation, scale = 1, color, speed }) {
  return (
    <Float speed={speed} rotationIntensity={0.18} floatIntensity={0.55} floatingRange={[-0.14, 0.14]}>
      <RoundedBox args={[1.5, 1, 0.06]} radius={0.07} smoothness={4} position={position} rotation={rotation} scale={scale}>
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.12} />
      </RoundedBox>
      {/* A lighter inset panel reads as the "content" of the card. */}
      <RoundedBox
        args={[1.16, 0.44, 0.02]}
        radius={0.03}
        smoothness={3}
        position={[position[0], position[1] + 0.16, position[2] + 0.05]}
        rotation={rotation}
        scale={scale}
      >
        <meshStandardMaterial color={CREAM} roughness={0.65} opacity={0.5} transparent />
      </RoundedBox>
    </Float>
  );
}

function Certificate() {
  const group = useRef();

  useFrame((state) => {
    if (!group.current) return;
    // One slow sway, roughly a 12-second cycle. Slow enough to feel ambient.
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.18) * 0.22;
    group.current.rotation.x = Math.sin(t * 0.13) * 0.06;
  });

  return (
    <group ref={group} position={[0.15, 0.1, 0]}>
      <Float speed={0.7} rotationIntensity={0} floatIntensity={0.35} floatingRange={[-0.1, 0.1]}>
        <RoundedBox args={[2.5, 1.75, 0.05]} radius={0.05} smoothness={4}>
          <meshStandardMaterial color={CREAM} roughness={0.5} metalness={0.05} />
        </RoundedBox>
        {/* Gold seal. */}
        <mesh position={[0.78, -0.5, 0.05]}>
          <cylinderGeometry args={[0.2, 0.2, 0.03, 36]} />
          <meshStandardMaterial
            color={GOLD}
            roughness={0.22}
            metalness={0.75}
            emissive={GOLD}
            emissiveIntensity={0.22}
          />
        </mesh>
        {/* Ruled lines standing in for the certificate text. */}
        {[0.42, 0.14, -0.14].map((y, i) => (
          <mesh key={y} position={[-0.15, y, 0.04]}>
            <planeGeometry args={[i === 0 ? 1.5 : 1.75, 0.075]} />
            <meshStandardMaterial color={TEAL_DEEP} roughness={0.85} opacity={0.4} transparent />
          </mesh>
        ))}
      </Float>
    </group>
  );
}

function Scene() {
  // Fixed layout: the cards frame the certificate without crossing it.
  const cards = useMemo(
    () => [
      { position: [-3.1, 0.9, -1.4], rotation: [0.12, 0.42, -0.1], color: TEAL, speed: 0.85, scale: 1 },
      { position: [-2.4, -1.25, -0.6], rotation: [-0.08, 0.3, 0.14], color: TEAL_DEEP, speed: 1.05, scale: 0.82 },
      { position: [3.0, 1.35, -1.8], rotation: [0.16, -0.46, 0.12], color: TEAL_DEEP, speed: 0.95, scale: 0.95 },
      { position: [2.6, -1.1, -0.9], rotation: [-0.1, -0.32, -0.12], color: TEAL, speed: 0.75, scale: 0.88 },
    ],
    [],
  );

  return (
    <>
      <color attach="background" args={['#0d2a32']} />
      {/* Warm key light from the upper left, cool teal fill from behind: the
          certificate catches the gold, the cards stay in brand teal. */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 5, 4]} intensity={1.35} color={GOLD} />
      <directionalLight position={[-5, 1, -3]} intensity={0.7} color={TEAL} />
      <pointLight position={[0, 0, 3]} intensity={18} distance={12} color={CREAM} />

      <Certificate />
      {cards.map((card) => (
        <LessonCard key={card.position.join(',')} {...card} />
      ))}
    </>
  );
}

export function Hero3DCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.2], fov: 42 }}
      // Capped device pixel ratio: a retina laptop does not need 3x here, and
      // the hero should never be the reason a page feels slow.
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Scene />
    </Canvas>
  );
}
