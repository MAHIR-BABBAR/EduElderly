import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';

function FloatingOrbs() {
  const group = useRef();

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.08;
    }
  });

  return (
    <group ref={group}>
      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.8}>
        <mesh position={[2.2, 0.6, -1]}>
          <icosahedronGeometry args={[0.9, 1]} />
          <meshStandardMaterial color="#E8A838" emissive="#E8A838" emissiveIntensity={0.15} />
        </mesh>
      </Float>
      <Float speed={0.8} rotationIntensity={0.3} floatIntensity={0.5}>
        <mesh position={[-2, -0.4, 0]}>
          <torusKnotGeometry args={[0.5, 0.15, 128, 16]} />
          <meshStandardMaterial color="#1B5E6B" metalness={0.3} roughness={0.4} />
        </mesh>
      </Float>
      <Float speed={1} floatIntensity={0.6}>
        <mesh position={[0, 1.2, -2]}>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial color="#FFF4E0" emissive="#E8A838" emissiveIntensity={0.2} />
        </mesh>
      </Float>
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#0d2a32']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#E8A838" />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#1B5E6B" />
      <Stars radius={80} depth={40} count={1200} factor={3} saturation={0.2} fade speed={0.5} />
      <FloatingOrbs />
    </>
  );
}

export function Hero3DCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Scene />
    </Canvas>
  );
}
