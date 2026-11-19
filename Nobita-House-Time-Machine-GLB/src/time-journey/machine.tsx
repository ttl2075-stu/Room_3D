import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

// The five ACTUAL rigged GLB files shipped by the Nobita House repository.
const crew = [
  { id: 'nobita', x: -1.55, z: -0.12, yaw: 0.2, clip: 'wave' },
  { id: 'shizuka', x: -0.86, z: 0.73, yaw: 0.08, clip: 'idle' },
  { id: 'doraemon', x: 0.0, z: -0.25, yaw: 0, clip: 'stand-cheerful' },
  { id: 'jaian', x: 0.95, z: 0.75, yaw: -0.16, clip: 'cheer' },
  { id: 'suneo', x: 1.78, z: -0.07, yaw: -0.23, clip: 'talk' },
] as const;

function CrewMember({ id, position, yaw, clip }: {
  id: string; position: [number, number, number]; yaw: number; clip: string;
}) {
  const gltf = useGLTF(`/models/characters/${id}.glb`);
  const model = useMemo(() => cloneSkeleton(gltf.scene), [gltf.scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.castShadow = true;
      node.receiveShadow = true;
      // Skinned bounds at rest can be too small once the animation raises a hand.
      if (node instanceof THREE.SkinnedMesh) node.frustumCulled = false;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        for (const map of [material.map, material.normalMap]) {
          if (!map) continue;
          map.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
          map.needsUpdate = true;
        }
      }
    });
  }, [model, gl]);

  useEffect(() => {
    const animation = gltf.animations.find((a) => a.name === clip)
      ?? gltf.animations.find((a) => a.name === 'idle')
      ?? gltf.animations[0];
    if (!animation) return;
    const action = mixer.clipAction(animation);
    action.reset().fadeIn(0.25).play();
    return () => { action.stop(); mixer.stopAllAction(); };
  }, [gltf.animations, mixer, clip]);

  useFrame((_, delta) => mixer.update(Math.min(delta, 0.05)));

  // Original model faces +Z. Characters face the -Z front of the ship here.
  return <group position={position} rotation={[0, Math.PI + yaw, 0]}>
    <primitive object={model} />
  </group>;
}

function RoundedPart({ position, size, color, radius = 0.08, metalness = 0.03 }: {
  position: [number,number,number]; size: [number,number,number]; color: string; radius?: number; metalness?: number;
}) {
  return <mesh castShadow receiveShadow position={position}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.43} metalness={metalness} />
  </mesh>;
}

function TimeMachineModel() {
  const lamp = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (lamp.current) lamp.current.intensity = 1.6 + Math.sin(clock.elapsedTime * 3) * 0.25;
  });

  return <group name="time-machine-with-original-GLB-crew">
    {/* Rounded platform, control box and red seat are real 3D meshes. */}
    <RoundedPart position={[0, 0.14, 0]} size={[5.5,0.3,3.6]} color="#567bbb" />
    <RoundedPart position={[0, 0.33, 0]} size={[5.15,0.1,3.24]} color="#a6b9eb" />
    <RoundedPart position={[0,0.55,1.3]} size={[3.25,0.32,0.66]} color="#cf4454" />
    <RoundedPart position={[0,1.05,1.61]} size={[3.25,0.95,0.18]} color="#d84759" />
    {[-2.52,2.52].map((x) => <mesh key={x} castShadow position={[x,0.17,0]} rotation={[Math.PI/2,0,0]}>
      <cylinderGeometry args={[0.2,0.2,3.75,24]} />
      <meshStandardMaterial color="#2e619e" roughness={0.35} />
    </mesh>)}
    <RoundedPart position={[0,0.73,-1.58]} size={[2.48,0.8,0.54]} color="#f2cf74" />
    <RoundedPart position={[0,1.14,-1.44]} size={[2.25,0.1,0.58]} color="#fff3c1" />
    {[-0.65,-0.23,0.23,0.65].map((x,i) => <mesh key={x} position={[x,1.23,-1.41]}>
      <sphereGeometry args={[0.09,16,12]} />
      <meshStandardMaterial color={['#fe6069','#57c2ff','#6ed5a3','#ffd94a'][i]} />
    </mesh>)}
    <mesh position={[0.86,1.48,-1.5]} rotation={[0,0,0.17]}><cylinderGeometry args={[0.045,0.045,0.52,12]} /><meshStandardMaterial color="#8c6e48" /></mesh>
    <mesh position={[0.9,1.75,-1.5]}><sphereGeometry args={[0.13,16,12]}/><meshStandardMaterial color="#e54c58" /></mesh>
    {/* Clock: set on the outer right so it does not obscure the five faces. */}
    <mesh position={[2.3,1.25,-1.2]}><cylinderGeometry args={[0.045,0.045,2,12]}/><meshStandardMaterial color="#e9b65a"/></mesh>
    <mesh position={[2.3,2.3,-1.2]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.39,0.39,0.16,40]}/><meshStandardMaterial color="#e55b66" /></mesh>
    <mesh position={[2.3,2.3,-1.31]} rotation={[0,Math.PI,0]}><circleGeometry args={[0.33,40]}/><meshStandardMaterial color="#fffdf2"/></mesh>
    <mesh position={[2.28,2.33,-1.38]}><boxGeometry args={[0.04,0.22,0.02]}/><meshStandardMaterial color="#335476" /></mesh>
    {/* A warm lamp, offset from all character heads. */}
    <mesh position={[-2.35,1.5,0.65]}><cylinderGeometry args={[0.055,0.055,2.5,14]}/><meshStandardMaterial color="#f5cd65"/></mesh>
    <mesh position={[-2.35,2.86,0.65]} scale={[1,0.46,0.65]}><sphereGeometry args={[0.58,24,16]}/><meshStandardMaterial color="#fff1bd" roughness={0.3}/></mesh>
    <pointLight ref={lamp} position={[-2.25,2.7,0.65]} color="#fff3bd" intensity={2} distance={7}/>
    {/* Character originals from uploaded repository (not handmade low-poly proxies). */}
    {crew.map(({id,x,z,yaw,clip}) => <CrewMember key={id} id={id} position={[x,0.39,z]} yaw={yaw} clip={clip} />)}
    <pointLight position={[0,2,-0.8]} intensity={2.6} color="#d7edff" distance={9} />
    <pointLight position={[1.8,1.3,1.3]} intensity={1.4} color="#fff4c8" distance={7} />
  </group>;
}

export const TimeMachine = memo(TimeMachineModel);

for (const id of ['doraemon','nobita','shizuka','jaian','suneo']) {
  useGLTF.preload(`/models/characters/${id}.glb`);
}
