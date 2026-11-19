import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { HouseModel } from '../editor/house/house-model';
import { LEVEL } from '../editor/house/plan';
import { TimeMachine } from './machine';
import { Gallery } from './gallery';
import { PORTALS, TimeTunnel } from './tunnel';
import '../styles/journey.css';

type Phase = 'room' | 'boarding' | 'flight';
type ViewMode = 'front' | 'chase';
interface ShipPose {
  position: THREE.Vector3;
  yaw: number; pitch: number; roll: number;
  speed: number;
  autoIndex: number | null;
  keys: Set<string>;
}
const ROOM_EYE = new THREE.Vector3(3.22, LEVEL.upper + 1.42, -5.66);
const DESK_AIM = new THREE.Vector3(2.13, LEVEL.upper + 0.85, -3.08);
const ROOM_BOARD_EYE = new THREE.Vector3(2.13, LEVEL.upper + 0.90, -3.74);
const ROOM_BOARD_AIM = new THREE.Vector3(2.13, LEVEL.upper + 0.62, -3.05);

function SceneAtmosphere({phase}: {phase:Phase}) {
  const scene=useThree((state)=>state.scene);
  useEffect(()=>{
    const isFlight=phase==='flight';
    scene.background=new THREE.Color(isFlight?'#0a2747':'#dff3fd');
    scene.fog=isFlight?new THREE.Fog('#0b3557',36,164):null;
    return ()=>{scene.fog=null;};
  },[scene,phase]);
  return null;
}

function RoomScene({ onBoard }: { onBoard:()=>void }) {
  return <group name="original-Nobita-room-preserved">
    <ambientLight intensity={1.05} color="#e8f6ff"/>
    <hemisphereLight args={['#ffffff','#b8c7ad',1.35]}/>
    <directionalLight position={[1.2,9.4,-1.5]} color="#fff4de" intensity={1.9} castShadow shadow-mapSize={[2048,2048]}/>
    <pointLight position={[2.4,LEVEL.upper+1.88,-4.9]} intensity={5.6} distance={8} color="#fff0d1"/>
    <pointLight position={[1.5,LEVEL.upper+1.9,-3.2]} intensity={2.2} distance={6} color="#d4efff"/>
    <Suspense fallback={<Html center position={[2.3,LEVEL.upper+1,-4.6]}><div className="journey-loading">Đang dựng phòng Nobita…</div></Html>}>
      <HouseModel cutY={null} paving={false}/>
    </Suspense>
    {/* Exact desk coordinates from original src/editor/house/plan.ts, not a fake 2D overlay. */}
    <mesh name="interactive-nobita-desk-drawer" position={[2.13,LEVEL.upper+0.55,-3.08]} onClick={(e)=>{e.stopPropagation();onBoard();}}
      onPointerOver={()=>{document.body.style.cursor='pointer';}}
      onPointerOut={()=>{document.body.style.cursor='';}}>
      <boxGeometry args={[1.05,0.74,0.60]}/>
      <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
    </mesh>
    <group position={[2.13,LEVEL.upper+0.72,-2.73]}>
      <mesh><torusGeometry args={[0.18,0.024,12,60]}/><meshBasicMaterial color="#42b7f5" toneMapped={false}/></mesh>
      <pointLight intensity={1.7} color="#89ddff" distance={2}/>
      <Html center position={[0,0.40,0]} distanceFactor={3.6}>
        <button className="journey-room-marker" onClick={onBoard}>✦ Mở ngăn bàn</button>
      </Html>
    </group>
  </group>;
}

function FlightScene({
  ship, onSelect, onSpeed,
}: { ship: {current:ShipPose}; onSelect:(index:number)=>void; onSpeed:(speed:number)=>void }) {
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const speedTick = useRef(0);
  useFrame(({clock}, dt0)=>{
    if(!group.current)return;
    const dt=Math.min(dt0,0.05);
    const data=ship.current;
    elapsed.current+=dt;
    if(data.autoIndex!==null){
      const portal=PORTALS[data.autoIndex];
      if(portal){
        const point=new THREE.Vector3(portal.position[0],portal.position[1],portal.position[2]+4.25);
        const move=point.clone().sub(data.position);
        const dist=move.length();
        if(dist<2.8){ data.autoIndex=null;data.speed=0;onSelect(PORTALS.indexOf(portal)); }
        else{
          move.normalize();data.position.addScaledVector(move,Math.min(dist,11*dt));
          data.yaw=THREE.MathUtils.damp(data.yaw,Math.atan2(-move.x,-move.z),1.6,dt);
          data.pitch=THREE.MathUtils.damp(data.pitch,0,2.2,dt);
          data.roll=THREE.MathUtils.damp(data.roll,0,2.2,dt);
          data.speed=11;
        }
      }
    }else{
      const keys=data.keys;
      if(keys.has('KeyA')||keys.has('ArrowLeft'))data.yaw+=dt*1.4;
      if(keys.has('KeyD')||keys.has('ArrowRight'))data.yaw-=dt*1.4;
      if(keys.has('ArrowUp'))data.pitch=THREE.MathUtils.clamp(data.pitch+dt*.7,-.57,.57);
      if(keys.has('ArrowDown'))data.pitch=THREE.MathUtils.clamp(data.pitch-dt*.7,-.57,.57);
      if(keys.has('KeyQ'))data.roll+=dt*0.9;
      if(keys.has('KeyZ'))data.roll-=dt*0.9;
      if(keys.has('KeyV')){data.pitch=THREE.MathUtils.damp(data.pitch,0,5,dt);data.roll=THREE.MathUtils.damp(data.roll,0,5,dt);}
      if(keys.has('KeyW'))data.speed=Math.min(12,data.speed+dt*7);
      else if(keys.has('KeyS'))data.speed=Math.max(-4,data.speed-dt*6);
      else data.speed=THREE.MathUtils.damp(data.speed,0,1.8,dt);
      if(keys.has('Space'))data.speed=THREE.MathUtils.damp(data.speed,0,12,dt);
      const orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(data.pitch,data.yaw,data.roll,'YXZ'));
      const forward=new THREE.Vector3(0,0,-1).applyQuaternion(orientation);
      data.position.addScaledVector(forward,data.speed*dt);
      if(keys.has('KeyR'))data.position.y+=dt*3;
      if(keys.has('KeyF'))data.position.y-=dt*3;
    }
    // Spatial limits apply to the machine only; the room never moves.
    data.position.x=THREE.MathUtils.clamp(data.position.x,-5.4,5.4);
    data.position.y=THREE.MathUtils.clamp(data.position.y,-1.0,5.9);
    data.position.z=THREE.MathUtils.clamp(data.position.z,-121,8.5);
    group.current.position.copy(data.position);
    group.current.rotation.order='YXZ';
    group.current.rotation.set(data.pitch,data.yaw,data.roll);
    group.current.position.y+=Math.sin(clock.elapsedTime*1.85)*0.065;
    speedTick.current+=dt;
    if(speedTick.current>0.32){speedTick.current=0;onSpeed(Math.abs(data.speed));}
  });
  return <group ref={group} position={[0,2,6]}>
    <TimeMachine/>
    <pointLight position={[0,-0.6,1.3]} intensity={5.7} color="#76d7fa" distance={7}/>
  </group>;
}

function CameraDirector({phase,ship,viewMode}: {phase:Phase;ship:{current:ShipPose};viewMode:ViewMode}) {
  const {camera,gl}=useThree();
  const lookRef=useRef(DESK_AIM.clone());
  const orbit=useRef({yaw:0,pitch:0,dragging:false,x:0,y:0});
  useEffect(()=>{
    if(phase!=='room')return;
    const dom=gl.domElement;
    const down=(e:PointerEvent)=>{if(e.button!==0)return;orbit.current.dragging=true;orbit.current.x=e.clientX;orbit.current.y=e.clientY;};
    const move=(e:PointerEvent)=>{if(!orbit.current.dragging)return;const o=orbit.current;
      o.yaw=THREE.MathUtils.clamp(o.yaw+(e.clientX-o.x)*0.0025,-0.42,0.42);
      o.pitch=THREE.MathUtils.clamp(o.pitch+(e.clientY-o.y)*0.0017,-0.24,0.24);
      o.x=e.clientX;o.y=e.clientY;
    };
    const up=()=>{orbit.current.dragging=false;};
    dom.addEventListener('pointerdown',down);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
    return ()=>{dom.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};
  },[gl,phase]);
  useEffect(()=>{
    if(phase==='flight'){
      const p=ship.current.position;
      camera.position.set(p.x,p.y+2.9,p.z-9.0);
      lookRef.current.set(p.x,p.y+1,p.z);
    }
  },[phase,camera,ship]);
  useFrame((_,delta)=>{
    const dt=Math.min(delta,.05);
    if(phase!=='flight'){
      const o=orbit.current;
      const pos=phase==='boarding'?ROOM_BOARD_EYE:ROOM_EYE;
      const aim=(phase==='boarding'?ROOM_BOARD_AIM:DESK_AIM).clone();
      if(phase==='room')aim.add(new THREE.Vector3(o.yaw*1.7,-o.pitch*1.25,0));
      camera.position.lerp(pos,1-Math.exp(-3.8*dt));
      lookRef.current.lerp(aim,1-Math.exp(-6*dt));
    }else{
      const s=ship.current;
      const quat=new THREE.Quaternion().setFromEuler(new THREE.Euler(s.pitch,s.yaw,s.roll,'YXZ'));
      const forward=new THREE.Vector3(0,0,-1).applyQuaternion(quat);
      const desired=s.position.clone().addScaledVector(forward,viewMode==='front'?8.7:-8.1).add(new THREE.Vector3(0,viewMode==='front'?3.15:3.7,0));
      camera.position.lerp(desired,1-Math.exp(-3.5*dt));
      lookRef.current.lerp(s.position.clone().add(new THREE.Vector3(0,1,0)),1-Math.exp(-4.8*dt));
    }
    camera.lookAt(lookRef.current);
  });
  return null;
}

function WebglError({error}: {error:string}) {
  return <div className="journey-error panel"><h2>Không hiển thị được cảnh 3D</h2><p>{error}</p><p>Hãy kiểm tra phần cứng WebGL2 hoặc mở Console (F12) để xem chi tiết.</p></div>;
}

export default function TimeJourney() {
  const [phase,setPhase]=useState<Phase>('room');
  const [warp,setWarp]=useState(false);
  const [album,setAlbum]=useState<number|null>(null);
  const [viewMode,setViewMode]=useState<ViewMode>('front');
  const [quality,setQuality]=useState<'sharp'|'balanced'>('sharp');
  const [speed,setSpeed]=useState(0);
  const [error,setError]=useState('');
  const ship=useRef<ShipPose>({position:new THREE.Vector3(0,2,6),yaw:0,pitch:0,roll:0,speed:0,autoIndex:null,keys:new Set()});
  const timers=useRef<number[]>([]);

  const board=useCallback(()=>{
    if(phase!=='room')return;
    setPhase('boarding');setWarp(true);
    // A full-screen door glow conceals renderer handover; room itself does not move.
    timers.current.push(window.setTimeout(()=>setPhase('flight'),1400));
    timers.current.push(window.setTimeout(()=>setWarp(false),2080));
  },[phase]);
  const returnRoom=useCallback(()=>{
    setAlbum(null);setWarp(true);
    ship.current={position:new THREE.Vector3(0,2,6),yaw:0,pitch:0,roll:0,speed:0,autoIndex:null,keys:new Set()};
    timers.current.push(window.setTimeout(()=>setPhase('room'),600));
    timers.current.push(window.setTimeout(()=>setWarp(false),1300));
  },[]);
  useEffect(()=>()=>{for(const timer of timers.current)window.clearTimeout(timer);},[]);

  useEffect(()=>{
    if(phase!=='flight'||album!==null)return;
    const down=(event:KeyboardEvent)=>{
      if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))event.preventDefault();
      ship.current.keys.add(event.code);
      if(/^Digit[1-4]$/.test(event.code)){ship.current.autoIndex=Number(event.code.slice(5))-1;}
      if(event.code==='KeyM')setViewMode((mode)=>mode==='front'?'chase':'front');
      if(event.code==='KeyE'){
        const nearest=PORTALS.map((p,i)=>({i,d:ship.current.position.distanceTo(new THREE.Vector3(...p.position))})).sort((a,b)=>a.d-b.d)[0];
        if(nearest&&nearest.d<9)setAlbum(nearest.i);
      }
    };
    const up=(event:KeyboardEvent)=>ship.current.keys.delete(event.code);
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);ship.current.keys.clear();};
  },[phase,album]);
  const goToPortal=(i:number)=>{ship.current.autoIndex=i;ship.current.speed=0;};

  useEffect(()=>{document.body.removeAttribute('aria-busy');},[]);
  useEffect(()=>{
    const onError=(event:ErrorEvent)=>{if(event.message)setError(event.message);};
    const onReject=(event:PromiseRejectionEvent)=>{
      const reason=event.reason as unknown;
      setError(reason instanceof Error?reason.message:String(reason));
    };
    window.addEventListener('error',onError);
    window.addEventListener('unhandledrejection',onReject);
    return ()=>{window.removeEventListener('error',onError);window.removeEventListener('unhandledrejection',onReject);};
  },[]);
  return <main className="journey-app">
    <Canvas
      className="journey-canvas"
      shadows
      dpr={quality==='sharp'?Math.min(window.devicePixelRatio*1.6,2.25):Math.min(window.devicePixelRatio,1.3)}
      camera={{position:[ROOM_EYE.x,ROOM_EYE.y,ROOM_EYE.z],fov:57,near:.06,far:250}}
      gl={{antialias:true,powerPreference:'high-performance',outputColorSpace:THREE.SRGBColorSpace,toneMapping:THREE.NoToneMapping}}
      onCreated={({gl})=>{gl.shadowMap.type=THREE.PCFSoftShadowMap;}}
    >
      <SceneAtmosphere phase={phase}/>
      <CameraDirector phase={phase} ship={ship} viewMode={viewMode}/>
      {phase!=='flight' ? <RoomScene onBoard={board}/> : <Suspense fallback={<Html center><div className="journey-loading">Đang tải 5 nhân vật 3D…</div></Html>}>
        <TimeTunnel onSelect={setAlbum}/>
        <FlightScene ship={ship} onSelect={setAlbum} onSpeed={setSpeed}/>
      </Suspense>}
    </Canvas>

    <div className="journey-ui">
      <header className="journey-header panel">
        <div className="journey-identity"><span className="journey-logo">⏰</span><div><b>NOBITA · TIME MEMORIES</b><small>{phase==='flight'?'Đang du hành qua miền ký ức':'Phòng Nobita · Không gian gốc 3D'}</small></div></div>
        <div className="journey-header-actions"><button className="journey-button" onClick={()=>setQuality(q=>q==='sharp'?'balanced':'sharp')}>Độ nét: {quality==='sharp'?'Cao':'Tiêu chuẩn'}</button><a className="journey-button" href="/characters/doraemon">Xem model gốc</a><a className="journey-button" href="/house">Khám phá nhà</a></div>
      </header>
      {phase!=='flight'?<section className="journey-intro panel">
        <p className="journey-eyebrow">KHỞI ĐẦU CHUYẾN DU HÀNH</p>
        <h1>Phòng của Nobita</h1>
        <p>Bạn đang đứng trong căn phòng thật của repo gốc. Bàn học ngay phía trước có ngăn kéo dẫn đến cỗ máy thời gian.</p>
        <button className="journey-button journey-button-primary" disabled={phase==='boarding'} onClick={board}>{phase==='boarding'?'Đang mở ngăn bàn…':'Mở ngăn bàn · Lên cỗ máy'}</button>
        <small>Kéo chuột để nhìn quanh · Hoặc nhấn trực tiếp vào ngăn bàn 3D</small>
      </section>: <>
        <section className="journey-flight-controls panel">
          <p className="journey-eyebrow">CHUYẾN DU HÀNH</p><h2>Cỗ máy thời gian</h2>
          <p>5 nhân vật là model GLB có animation từ repo Nobita House.</p>
          <div className="journey-stats"><span>Tốc độ <strong>{Math.round(speed)} m/s</strong></span><span>Camera <strong>{viewMode==='front'?'Chính diện':'Theo sau'}</strong></span></div>
          <div className="journey-row"><button className="journey-button journey-button-primary" onClick={()=>setViewMode(m=>m==='front'?'chase':'front')}>Đổi góc camera (M)</button><button className="journey-button" onClick={returnRoom}>Về phòng Nobita</button></div>
          <small>W/S: tiến/lùi · A/D: rẽ · ↑/↓: ngẩng/cúi · Q/Z: nghiêng · R/F: lên/xuống · Space: phanh · E: mở cửa</small>
        </section>
        <aside className="journey-portals panel">
          <p className="journey-eyebrow">BỐN CỬA KÝ ỨC</p>
          {PORTALS.map((p,i)=><div className="journey-stop" key={i}>
            <span className="journey-stop-dot" style={{background:p.color}}/>
            <div><b>{p.title}</b><small>{p.date}</small></div>
            <button className="journey-small-button" onClick={()=>goToPortal(i)}>Bay đến</button>
            <button className="journey-small-button" onClick={()=>setAlbum(i)}>Xem</button>
          </div>)}
        </aside>
      </>}
      <div className="journey-bottom"><span>✦ Phòng 3D gốc · 5 GLB thật · ký ức tương tác</span><span>{phase==='flight'?'Bấm cửa 3D để mở album':'Căn phòng cố định · Doraemon cùng bạn di chuyển'}</span></div>
    </div>
    <div className={`journey-warp ${warp?'visible':''}`} aria-hidden="true"><span>✧</span></div>
    {album!==null&&<Gallery album={album} onClose={()=>setAlbum(null)}/>}
    {error&&<WebglError error={error}/>}
  </main>;
}
