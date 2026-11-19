import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';

export const PORTALS = [
  { title: 'Ngày đầu gặp gỡ', date: 'Hồi ức 01', color: '#7fe1ff', position: [-3.25, 2.1, -25] as [number,number,number] },
  { title: 'Những chuyến đi', date: 'Hồi ức 02', color: '#ffe19a', position: [3.2, 2.1, -50] as [number,number,number] },
  { title: 'Khoảnh khắc đẹp', date: 'Hồi ức 03', color: '#a4f4cb', position: [-3.25, 2.1, -75] as [number,number,number] },
  { title: 'Lời hẹn tương lai', date: 'Hồi ức 04', color: '#ffb9c1', position: [3.2, 2.1, -100] as [number,number,number] },
];

function FloatingClock({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);
  const angle = index * 2.39996;
  const radius = 5.7 + (index % 3) * 0.72;
  const x = Math.cos(angle) * radius;
  const y = 2.1 + Math.sin(angle) * radius * 0.71;
  const z = 2 - index * 4.3;
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.3 + index) * 0.23;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.42 + index * 0.9) * 0.17;
    group.current.position.y = y + Math.sin(clock.elapsedTime * 0.7 + index) * 0.24;
  });
  return <group ref={group} position={[x,y,z]} rotation={[0,(index%4)*0.17,0]}>
    <mesh castShadow rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.56,0.56,0.15,36]}/><meshStandardMaterial color={index%2 ? '#efb56f':'#76b7da'} roughness={0.42}/></mesh>
    <mesh position={[0,0,0.084]}><circleGeometry args={[0.48,36]}/><meshBasicMaterial color="#fffcf2"/></mesh>
    {Array.from({length:12},(_,i)=><mesh key={i} position={[Math.sin(i*Math.PI/6)*0.39,Math.cos(i*Math.PI/6)*0.39,0.092]}>
      <sphereGeometry args={[0.021,6,6]}/><meshBasicMaterial color="#294d66"/></mesh>)}
    <mesh position={[0.09,0.055,0.106]} rotation={[0,0,-0.6]}><boxGeometry args={[0.028,0.24,0.02]}/><meshBasicMaterial color="#225479"/></mesh>
    <mesh position={[-0.06,0.045,0.110]} rotation={[0,0,0.9]}><boxGeometry args={[0.022,0.33,0.02]}/><meshBasicMaterial color="#c35f5e"/></mesh>
  </group>;
}

function MemoryDoor({ index, onSelect }: { index: number; onSelect: (index:number)=>void }) {
  const door = PORTALS[index];
  if (!door) return null;
  return <group position={door.position} onClick={(event) => {event.stopPropagation();onSelect(index);}}>
    <mesh castShadow position={[0,0,0]}>
      <boxGeometry args={[2.2,3.65,0.28]}/>
      <meshStandardMaterial color="#f7fcff" roughness={0.34} emissive={door.color} emissiveIntensity={0.17}/>
    </mesh>
    <mesh position={[0,0,0.17]}><planeGeometry args={[1.88,3.28]}/><meshBasicMaterial color={door.color} side={THREE.DoubleSide} toneMapped={false}/></mesh>
    <mesh position={[0,0,0.185]}><planeGeometry args={[1.55,2.95]}/><meshBasicMaterial color="#effaff" transparent opacity={0.32} depthWrite={false}/></mesh>
    <mesh position={[0,0,0.22]}><torusGeometry args={[1.66,0.07,12,64]}/><meshBasicMaterial color={door.color} side={THREE.DoubleSide} toneMapped={false}/></mesh>
    <mesh position={[0.73,-0.14,0.24]}><sphereGeometry args={[0.09,16,12]}/><meshStandardMaterial color="#e6af52"/></mesh>
    <pointLight color={door.color} intensity={8} distance={9} position={[0,0,0.6]}/>
    <Html center position={[0,2.27,0]} distanceFactor={8} occlude={false}>
      <button className="journey-portal-label" onClick={(event)=>{event.stopPropagation();onSelect(index);}}>
        {door.date}<strong>{door.title}</strong>
      </button>
    </Html>
  </group>;
}

function TimeTunnelModel({ onSelect }: { onSelect:(index:number)=>void }) {
  const particles = useMemo(() => {
    // Deterministic positions: no flickering when React rerenders.
    let seed=20261120;
    const rnd=()=>{ seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
    const points = new Float32Array(2600*3);
    for(let i=0;i<2600;i++){
      const a=rnd()*Math.PI*2, r=7.8+rnd()*3.6;
      points[i*3]=Math.cos(a)*r;
      points[i*3+1]=2.2+Math.sin(a)*r;
      points[i*3+2]=12-rnd()*140;
    }
    return points;
  },[]);
  return <group name="blue-time-tunnel">
    <ambientLight intensity={0.78} color="#bdeeff"/>
    <hemisphereLight intensity={1.4} args={['#f0fcff','#163f65',1.4]}/>
    <directionalLight position={[5,10,6]} intensity={2.2} color="#ffffff" castShadow shadow-mapSize={[2048,2048]}/>
    <pointLight position={[0,2,8]} color="#90dbff" intensity={60} distance={25}/>
    <pointLight position={[1,5,-46]} color="#c7f9ef" intensity={50} distance={28}/>
    <pointLight position={[-3,0,-85]} color="#ffe6a4" intensity={46} distance={27}/>
    {/* Visible from inside, ~19m diameter and ~140m long; no flat billboard tunnel. */}
    <mesh rotation={[Math.PI/2,0,0]} position={[0,2,-59]}>
      <cylinderGeometry args={[9.8,9.8,145,72,1,true]}/>
      <meshStandardMaterial color="#248bbd" emissive="#0b639b" emissiveIntensity={0.44} roughness={0.88} side={THREE.BackSide} />
    </mesh>
    {Array.from({length:29},(_,i)=> <mesh key={`ring-${i}`} position={[Math.sin(i*0.5)*0.36,2+Math.cos(i*0.42)*0.28,11-i*4.7]}>
      <torusGeometry args={[8.95 + Math.sin(i*0.33)*0.24,0.13,12,80]}/>
      <meshBasicMaterial color={i%4===0 ? '#ffe7aa' : i%2 ? '#8de6ff' : '#dcfdff'} transparent opacity={0.66} toneMapped={false}/>
    </mesh>)}
    {Array.from({length:30},(_,i)=><FloatingClock key={`clock-${i}`} index={i}/>)}
    <points>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[particles,3]}/></bufferGeometry>
      <pointsMaterial color="#eaffff" size={0.12} sizeAttenuation transparent opacity={0.8} depthWrite={false}/>
    </points>
    {/* Ribbon strips spiral around the actual tunnel axis. */}
    {Array.from({length:5},(_,band)=>{
      const points=[] as THREE.Vector3[];
      for(let j=0;j<=72;j++){
        const z=10-j*1.88, a=j*.23+band*Math.PI*2/5;
        points.push(new THREE.Vector3(Math.sin(a)*8.25,2+Math.cos(a)*8.25,z));
      }
      return <mesh key={`ribbon-${band}`} geometry={new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),220,0.045,6,false)}>
        <meshBasicMaterial color={band%2?'#eafcff':'#87dafa'} transparent opacity={0.42} toneMapped={false}/>
      </mesh>;
    })}
    {PORTALS.map((_,i)=><MemoryDoor key={i} index={i} onSelect={onSelect}/>)}
  </group>;
}

// Memoised: telemetry HUD updates must not regenerate tube geometry / clocks every frame.
export const TimeTunnel = memo(TimeTunnelModel);
