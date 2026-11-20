import { useFrame } from '@react-three/fiber';
import { memo, useRef } from 'react';
import * as THREE from 'three';

import { FLIGHT_END, FLIGHT_START } from './memory-layout';

function FloatingClock({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);
  const angle = index * 2.39996;
  const radius = 7.7 + (index % 3) * 0.72;
  const x = Math.cos(angle) * radius;
  const y = 8.8 + Math.sin(angle) * 1.2;
  const z = THREE.MathUtils.lerp(FLIGHT_START, FLIGHT_END, index / 17);
  useFrame(({ camera, clock }) => {
    if (!group.current) return;
    group.current.visible = Math.abs(camera.position.z - z) < 62;
    if (!group.current.visible) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.3 + index) * 0.23;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.42 + index * 0.9) * 0.17;
    group.current.position.y = y + Math.sin(clock.elapsedTime * 0.7 + index) * 0.24;
  });
  return (
    <group ref={group} position={[x, y, z]} rotation={[0, (index % 4) * 0.17, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.56, 0.56, 0.15, 36]} />
        <meshStandardMaterial color={index % 2 ? '#efb56f' : '#76b7da'} roughness={0.42} />
      </mesh>
      {[0, Math.PI].map((rotation) => (
        <group key={rotation} rotation={[0, rotation, 0]}>
          <mesh position={[0, 0, 0.084]}>
            <circleGeometry args={[0.48, 36]} />
            <meshBasicMaterial color="#fffcf2" />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => (
            <mesh
              // biome-ignore lint/suspicious/noArrayIndexKey: Fixed clock tick marks never reorder.
              key={i}
              position={[Math.sin((i * Math.PI) / 6) * 0.39, Math.cos((i * Math.PI) / 6) * 0.39, 0.092]}
            >
              <sphereGeometry args={[0.021, 6, 6]} />
              <meshBasicMaterial color="#294d66" />
            </mesh>
          ))}
          <mesh position={[0.09, 0.055, 0.106]} rotation={[0, 0, -0.6]}>
            <boxGeometry args={[0.028, 0.24, 0.02]} />
            <meshBasicMaterial color="#225479" />
          </mesh>
          <mesh position={[-0.06, 0.045, 0.11]} rotation={[0, 0, 0.9]}>
            <boxGeometry args={[0.022, 0.33, 0.02]} />
            <meshBasicMaterial color="#c35f5e" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Camera-centred sky: direction-based noise has no panorama seam or open ends. */
function GalaxySky() {
  const sky = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    sky.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={sky} frustumCulled={false} renderOrder={-100}>
      <sphereGeometry args={[220, 48, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        vertexShader={`
        varying vec3 vDirection;
        void main() {
          vDirection = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `}
        fragmentShader={`
        varying vec3 vDirection;
        float hash(vec3 p) {
          p = fract(p * .3183099 + vec3(.11, .37, .73));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float noise(vec3 p) {
          vec3 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                         mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                         mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
        }
        float nebula(vec3 p) {
          float n = 0.0, weight = .55;
          for (int i = 0; i < 5; i++) {
            n += weight * noise(p);
            p = p * 2.03 + vec3(13.1, 7.7, 19.3);
            weight *= .5;
          }
          return n;
        }
        void main() {
          vec3 d = normalize(vDirection);
          float cloud = smoothstep(.25, .82, nebula(d * 4.0));
          float tint = nebula(d * 3.0 + vec3(21.0));
          vec3 color = vec3(.009, .006, .035);
          color += mix(vec3(.035,.06,.23), vec3(.24,.035,.28), tint) * cloud;
          color += vec3(.04,.1,.15) * pow(cloud, 3.0);
          vec3 grid = d * 155.0;
          vec3 cell = floor(grid);
          vec3 starCenter = vec3(hash(cell),hash(cell+17.0),hash(cell+43.0));
          float star = 1.0-smoothstep(.025,.14,length(fract(grid)-starCenter));
          star *= step(.90,hash(cell+71.0));
          color += mix(vec3(.57,.74,1.0),vec3(1.0,.84,.69),hash(cell+29.0))*star;
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }
      `}
      />
    </mesh>
  );
}

function TimeTunnelModel() {
  return (
    <group name="galaxy-time-space">
      <GalaxySky />
      <ambientLight intensity={0.78} color="#bdeeff" />
      <hemisphereLight intensity={1.4} args={['#f0fcff', '#163f65', 1.4]} />
      <directionalLight
        position={[5, 10, 6]}
        intensity={2.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 2, 8]} color="#90dbff" intensity={60} distance={25} />
      <pointLight position={[1, 5, -46]} color="#c7f9ef" intensity={50} distance={28} />
      <pointLight position={[-3, 0, -85]} color="#ffe6a4" intensity={46} distance={27} />
      {Array.from({ length: 18 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Fixed clock positions never reorder.
        <FloatingClock key={`clock-${i}`} index={i} />
      ))}
    </group>
  );
}

// Memoised: telemetry HUD updates must not regenerate tube geometry / clocks every frame.
export const TimeTunnel = memo(TimeTunnelModel);
