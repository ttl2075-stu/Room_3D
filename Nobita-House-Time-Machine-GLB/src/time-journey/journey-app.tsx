import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { HouseModel } from '../editor/house/house-model';
import { LEVEL, interiorOf, roomById } from '../editor/house/plan';
import { useReducedMotionRef } from '../utils/reduced-motion';
import { type WishCard } from '../wishes/demo';
import { WishDialog } from '../wishes/dialog';
import { WishWall, wishFrame } from '../wishes/wall';
import { TimeMachine } from './machine';
import { Gallery } from './gallery';
import { PORTALS, TimeTunnel } from './tunnel';
import '../styles/journey.css';
import '../styles/wishes.css';

type Phase = 'room' | 'boarding' | 'flight';
type JourneyScene = Exclude<Phase, 'boarding'>;
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
const CAMERA_FOV = 57;
const ROOM_BOUNDS = interiorOf(roomById('nobita').rects[0]!, 'upper');
const WISH_AIM = new THREE.Vector3(...wishFrame.center);
const DESK_LABELS = [new THREE.Vector3(2.13, LEVEL.upper + 1.12, -2.73)];
const PORTAL_LABELS = PORTALS.map(({ position }) => new THREE.Vector3(position[0], position[1] + 2.27, position[2]));

function WorldLabels({ anchors, buttons, distanceFactor }: {
  anchors: THREE.Vector3[];
  buttons: { current: (HTMLButtonElement | null)[] };
  distanceFactor: number;
}) {
  const point = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld();
    anchors.forEach((anchor, index) => {
      const button = buttons.current[index];
      if (!button) return;
      point.copy(anchor).project(camera);
      const visible = point.z >= -1 && point.z <= 1 && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1;
      button.hidden = !visible;
      if (!visible) return;
      const x = (point.x + 1) * size.width / 2;
      const y = (1 - point.y) * size.height / 2;
      const scale = THREE.MathUtils.clamp(distanceFactor / camera.position.distanceTo(anchor), .5, 1.2);
      button.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${scale})`;
    });
  });
  return null;
}

function SceneAtmosphere({phase}: {phase:Phase}) {
  const scene=useThree((state)=>state.scene);
  useEffect(()=>{
    const isFlight=phase==='flight';
    scene.background=new THREE.Color(isFlight?'#030209':'#dff3fd');
    scene.fog=null;
    return ()=>{scene.fog=null;};
  },[scene,phase]);
  return null;
}

function SceneReady({ scene, onReady }: {
  scene: JourneyScene;
  onReady: (scene: JourneyScene) => void;
}) {
  useEffect(() => { onReady(scene); }, [scene, onReady]);
  return null;
}

function RoomScene({ onBoard, onOpenWish, wishGallery, onReady }: {
  onBoard: () => void;
  onOpenWish?: (card: WishCard) => void;
  wishGallery: boolean;
  onReady: (scene: JourneyScene) => void;
}) {
  return <group name="original-Nobita-room-preserved">
    <ambientLight intensity={1.05} color="#e8f6ff"/>
    <hemisphereLight args={['#ffffff','#b8c7ad',1.35]}/>
    <directionalLight position={[1.2,9.4,-1.5]} color="#fff4de" intensity={1.9} castShadow shadow-mapSize={[2048,2048]}/>
    <pointLight position={[2.4,LEVEL.upper+1.88,-4.9]} intensity={5.6} distance={8} color="#fff0d1"/>
    <pointLight position={[1.5,LEVEL.upper+1.9,-3.2]} intensity={2.2} distance={6} color="#d4efff"/>
    <Suspense fallback={null}>
      <HouseModel cutY={null} paving={false}/>
      <SceneReady scene="room" onReady={onReady} />
    </Suspense>
    <Suspense fallback={null}>
      <WishWall onOpen={onOpenWish} />
    </Suspense>
    {!wishGallery && <>
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
    </group>
    </>}
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

function CameraDirector({phase,ship,viewMode,wishGallery,paused}: {
  phase:Phase; ship:{current:ShipPose}; viewMode:ViewMode; wishGallery:boolean; paused:boolean;
}) {
  const {camera,gl,size}=useThree();
  const reducedMotion = useReducedMotionRef();
  const wishEye = useMemo(() => {
    const halfView = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    const aspect = Math.max(.1, size.width / Math.max(1, size.height));
    const heightFraction = aspect < .8 ? .69 : .74;
    const distance = Math.min(2.58, Math.max(
      wishFrame.height / (2 * halfView * heightFraction),
      wishFrame.width / (2 * halfView * aspect * .86),
    ) + .07);
    return WISH_AIM.clone().add(new THREE.Vector3(-distance, 0, 0));
  }, [size.width, size.height]);
  const lookRef=useRef(DESK_AIM.clone());
  const initialDirection = DESK_AIM.clone().sub(ROOM_EYE).normalize();
  const orbit=useRef({yaw:Math.atan2(-initialDirection.x,-initialDirection.z),pitch:Math.asin(initialDirection.y),dragging:false,x:0,y:0});
  const roomPosition=useRef(ROOM_EYE.clone());
  const roomKeys=useRef(new Set<string>());
  const direction=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{
    if(phase!=='room'||wishGallery||paused)return;
    const down=(e:KeyboardEvent)=>{
      if(e.target instanceof HTMLElement && (e.target.closest('input,textarea,select,button')||e.target.isContentEditable))return;
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){
        e.preventDefault();roomKeys.current.add(e.code);
      }
    };
    const up=(e:KeyboardEvent)=>{roomKeys.current.delete(e.code);};
    const clear=()=>{roomKeys.current.clear();orbit.current.dragging=false;};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);
    return()=>{clear();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);};
  },[phase,wishGallery,paused]);
  useEffect(()=>{
    if(phase!=='room' || wishGallery || paused)return;
    const dom=gl.domElement;
    const down=(e:PointerEvent)=>{if(e.button!==0)return;orbit.current.dragging=true;orbit.current.x=e.clientX;orbit.current.y=e.clientY;};
    const move=(e:PointerEvent)=>{if(!orbit.current.dragging)return;const o=orbit.current;
      o.yaw-=(e.clientX-o.x)*0.0025;
      o.pitch=THREE.MathUtils.clamp(o.pitch-(e.clientY-o.y)*0.0025,-1.35,1.35);
      o.x=e.clientX;o.y=e.clientY;
    };
    const up=()=>{orbit.current.dragging=false;};
    dom.addEventListener('pointerdown',down);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);window.addEventListener('blur',up);
    return ()=>{orbit.current.dragging=false;dom.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);window.removeEventListener('blur',up);};
  },[gl,phase,wishGallery,paused]);
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
      const viewingWishes = phase === 'room' && wishGallery;
      const keys=roomKeys.current;
      if(phase==='room'&&!viewingWishes&&!paused){
        const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
        const right=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
        direction.set(-Math.sin(o.yaw)*forward+Math.cos(o.yaw)*right,0,-Math.cos(o.yaw)*forward-Math.sin(o.yaw)*right);
        if(direction.lengthSq()>0)roomPosition.current.addScaledVector(direction.normalize(),1.8*dt);
        roomPosition.current.x=THREE.MathUtils.clamp(roomPosition.current.x,ROOM_BOUNDS.x0+.2,ROOM_BOUNDS.x1-.2);
        roomPosition.current.z=THREE.MathUtils.clamp(roomPosition.current.z,ROOM_BOUNDS.z0+.2,ROOM_BOUNDS.z1-.2);
      }
      const pos=phase==='boarding'?ROOM_BOARD_EYE:viewingWishes?wishEye:roomPosition.current;
      const aim=(phase==='boarding'?ROOM_BOARD_AIM:viewingWishes?WISH_AIM:DESK_AIM).clone();
      if(phase==='room' && !viewingWishes)aim.copy(pos).add(direction.set(-Math.sin(o.yaw)*Math.cos(o.pitch),Math.sin(o.pitch),-Math.cos(o.yaw)*Math.cos(o.pitch)));
      const immediate = phase === 'room' && reducedMotion.current;
      camera.position.lerp(pos,immediate?1:1-Math.exp(-3.8*dt));
      lookRef.current.lerp(aim,immediate?1:1-Math.exp(-6*dt));
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
  const [readyScene, setReadyScene] = useState<JourneyScene | null>(null);
  const [wishGallery, setWishGallery] = useState(false);
  const [wish, setWish] = useState<WishCard | null>(null);
  const [unlockedRecipients, setUnlockedRecipients] = useState<ReadonlySet<string>>(() => new Set());
  const [warp,setWarp]=useState(false);
  const [album,setAlbum]=useState<number|null>(null);
  const [viewMode,setViewMode]=useState<ViewMode>('front');
  const quality = 'sharp';
  const [speed,setSpeed]=useState(0);
  const [error,setError]=useState('');
  const worldButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const ship=useRef<ShipPose>({position:new THREE.Vector3(0,2,6),yaw:0,pitch:0,roll:0,speed:0,autoIndex:null,keys:new Set()});
  const timers=useRef<number[]>([]);

  const board=useCallback(()=>{
    if(phase!=='room')return;
    setWishGallery(false);
    setWish(null);
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

  useEffect(() => {
    if (!wishGallery || wish) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWishGallery(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [wishGallery, wish]);

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
      camera={{position:[ROOM_EYE.x,ROOM_EYE.y,ROOM_EYE.z],fov:CAMERA_FOV,near:.06,far:250}}
      gl={{antialias:true,powerPreference:'high-performance',outputColorSpace:THREE.SRGBColorSpace,toneMapping:THREE.NoToneMapping}}
      onCreated={({gl})=>{gl.shadowMap.type=THREE.PCFSoftShadowMap;}}
    >
      <SceneAtmosphere phase={phase}/>
      <CameraDirector phase={phase} ship={ship} viewMode={viewMode} wishGallery={wishGallery} paused={wish !== null}/>
      {!wishGallery && <WorldLabels
        anchors={phase === 'flight' ? PORTAL_LABELS : DESK_LABELS}
        buttons={worldButtons}
        distanceFactor={phase === 'flight' ? 8 : 3.6}
      />}
      {phase!=='flight' ? <RoomScene onBoard={board} onOpenWish={phase === 'room' ? setWish : undefined}
        wishGallery={wishGallery} onReady={setReadyScene}/> : <Suspense fallback={null}>
        <TimeTunnel onSelect={setAlbum}/>
        <FlightScene ship={ship} onSelect={setAlbum} onSpeed={setSpeed}/>
        <SceneReady scene="flight" onReady={setReadyScene} />
      </Suspense>}
    </Canvas>

    <div className="journey-ui">
      {phase === 'flight' ? PORTALS.map((door, index) => (
        <button key={door.date} className="journey-portal-label journey-world-label"
          ref={(element) => { worldButtons.current[index] = element; }} hidden onClick={() => setAlbum(index)}>
          {door.date}<strong>{door.title}</strong>
        </button>
      )) : !wishGallery && (
        <button className="journey-room-marker journey-world-label" onClick={board}
          ref={(element) => { worldButtons.current[0] = element; }} hidden>
          ✦ Mở ngăn bàn
        </button>
      )}
      {readyScene !== (phase === 'flight' ? 'flight' : 'room') && (
        <div className="journey-loading journey-loading-state" role="status">
          {phase === 'flight' ? 'Đang tải cỗ máy thời gian…' : 'Đang dựng phòng Nobita…'}
        </div>
      )}
      {phase==='flight' && <>
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

    </div>
    <div className={`journey-warp ${warp?'visible':''}`} aria-hidden="true"><span>✧</span></div>
    {album!==null&&<Gallery album={album} onClose={()=>setAlbum(null)}/>}
    {wish && phase === 'room' && <WishDialog
      key={wish.id}
      card={wish}
      unlocked={unlockedRecipients.has(wish.recipient)}
      onUnlock={(recipient) => setUnlockedRecipients((current) => new Set([...current, recipient]))}
      onClose={() => setWish(null)}
    />}
    {error&&<WebglError error={error}/>}
  </main>;
}

