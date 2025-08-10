import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Leva, useControls } from "leva";

const vertexShader = /* glsl */`
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  uniform float uSpeed;
  uniform float uTidePeriod;
  uniform float uPointSize;
  uniform float uGlobalRise;
  attribute float aRnd;

  void main() {
    vec3 p = position;
    float wave = sin((p.x + uTime * uSpeed) * uFreq + aRnd * 6.2831);
    float tide = sin(uTime / uTidePeriod);
    p.y += wave * uAmp + tide * uAmp + uGlobalRise;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uPointSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */`
  void main() {
    gl_FragColor = vec4(0.2, 0.6, 0.9, 1.0);
  }
`;

function useStableUniforms({ amp, freq, speed, tidePeriod, pointSize, globalRise }) {
  const uniforms = useRef({
    uTime: { value: 0 },
    uAmp: { value: amp },
    uFreq: { value: freq },
    uSpeed: { value: speed },
    uTidePeriod: { value: tidePeriod },
    uPointSize: { value: pointSize },
    uGlobalRise: { value: globalRise },
  });
  return uniforms.current;
}

function TidePoints({
  grid = 220,
  spacing = 0.22,
  amp = 0.45,
  freq = 0.65,
  speed = 0.6,
  tidePeriod = 18.0,
  pointSize = 2.2,
  globalRise = 0.5,
  paused = false,
}) {
  const ref = useRef();

  const { positions, randoms } = useMemo(() => {
    const half = (grid - 1) / 2;
    const pos = new Float32Array(grid * grid * 3);
    const rnd = new Float32Array(grid * grid);
    let i = 0, j = 0;
    for (let z = 0; z < grid; z++) {
      for (let x = 0; x < grid; x++) {
        pos[i++] = (x - half) * spacing;
        pos[i++] = 0;
        pos[i++] = (z - half) * spacing;
        rnd[j++] = Math.random();
      }
    }
    return { positions: pos, randoms: rnd };
  }, [grid, spacing]);

  const uniforms = useStableUniforms({ amp, freq, speed, tidePeriod, pointSize, globalRise });

  useFrame((_, delta) => {
    const mat = ref.current?.material;
    const u = mat?.uniforms;
    if (u) {
      if (!paused) u.uTime.value += delta;
      u.uAmp.value = amp;
      u.uFreq.value = freq;
      u.uSpeed.value = speed;
      u.uTidePeriod.value = tidePeriod;
      u.uPointSize.value = pointSize;
      u.uGlobalRise.value = globalRise;
    }
  });

  return (
    <points ref={ref} frustumCulled={false} key={`grid-${grid}-spacing-${spacing}`}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aRnd" count={randoms.length} array={randoms} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        transparent
      />
    </points>
  );
}

function GlowHaze() {
  return (
    <mesh>
      <sphereGeometry args={[200, 32, 32]} />
      <meshBasicMaterial color={new THREE.Color(0x0a1b3a)} transparent opacity={0.35} side={THREE.BackSide} />
    </mesh>
  );
}

function FloorGrid() {
  return <gridHelper args={[60, 60, "#2a6680", "#1b3f52"]} position={[0, -2.5, 0]} />;
}

function Scene({ tide, view }) {
  const { scene, camera } = useThree();

  useEffect(() => {
    scene.fog = new THREE.Fog("#0a1b3a", view.fogNear, view.fogFar);
  }, [scene, view.fogNear, view.fogFar]);

  useEffect(() => {
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
  }, [camera, view.fov]);

  return (
    <>
      <color attach="background" args={["#0a1b3a"]} />
      <TidePoints
        amp={tide?.amp ?? 0.45}
        freq={tide?.freq ?? 0.65}
        speed={tide?.speed ?? 0.6}
        tidePeriod={tide?.tidePeriod ?? 18}
        pointSize={tide?.pointSize ?? 2.2}
        globalRise={tide?.globalRise ?? 0.5}
        grid={tide?.grid ?? 220}
        spacing={tide?.spacing ?? 0.22}
        paused={view.paused}
      />
      <GlowHaze />
      <FloorGrid />
      <OrbitControls />
    </>
  );
}

export default function TideParticleOcean() {
  const tide = useControls("Tide", {
    amp: { value: 0.45, min: 0, max: 2, step: 0.01 },
    freq: { value: 0.65, min: 0.05, max: 4, step: 0.01 },
    speed: { value: 0.6, min: -3, max: 3, step: 0.01 },
    tidePeriod: { value: 18, min: 1, max: 600, step: 0.5 },
    pointSize: { value: 2.2, min: 0.2, max: 12, step: 0.1 },
    globalRise: { value: 0.5, min: 0, max: 4, step: 0.01 },
    grid: { value: 220, min: 10, max: 600, step: 2 },
    spacing: { value: 0.22, min: 0.02, max: 2, step: 0.01 },
  });

  const view = useControls("View", {
    paused: { value: false },
    fogNear: { value: 20, min: 1, max: 80, step: 1 },
    fogFar: { value: 120, min: 40, max: 300, step: 1 },
    fov: { value: 45, min: 10, max: 120, step: 1 },
  });

  return (
    <>
      <Leva collapsed />
      <Canvas camera={{ position: [0, 10, 25], fov: view.fov }}>
        <Scene tide={tide} view={view} />
      </Canvas>
    </>
  );
}
