import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { HouseModel } from '../editor/house/house-model';
import { interiorOf, LEVEL, roomById } from '../editor/house/plan';
import { useReducedMotionRef } from '../utils/reduced-motion';
import { cards, type WishCard } from '../wishes/demo';
import { WishDialog } from '../wishes/dialog';
import { WishWall, wishFrame } from '../wishes/wall';
import { Gallery } from './gallery';
import { FlightScene, newShip, nudgeFlight, type ShipPose, stopFlight, travelTo } from './guided-flight';
import { MemoryExhibition } from './memory-exhibition';
import {
  closestLoopZ,
  type EventPlacement,
  FLIGHT_START,
  MEMORY_STATIONS,
  nearbyStation,
} from './memory-layout';
import { MemoryNavigation } from './memory-navigation';
import { TimeTunnel } from './tunnel';
import '../styles/journey.css';
import '../styles/wishes.css';

type Phase = 'room' | 'boarding' | 'flight';
type JourneyScene = Exclude<Phase, 'boarding'>;
type ViewMode = 'front' | 'chase';
const ROOM_EYE = new THREE.Vector3(3.22, LEVEL.upper + 1.42, -5.66);
const DESK_AIM = new THREE.Vector3(2.13, LEVEL.upper + 0.85, -3.08);
const ROOM_BOARD_EYE = new THREE.Vector3(2.13, LEVEL.upper + 0.9, -3.74);
const ROOM_BOARD_AIM = new THREE.Vector3(2.13, LEVEL.upper + 0.62, -3.05);
const CAMERA_FOV = 57;
const [nobitaRoom] = roomById('nobita').rects;
if (!nobitaRoom) throw new Error('Missing Nobita room bounds');
const ROOM_BOUNDS = interiorOf(nobitaRoom, 'upper');
const WISH_AIM = new THREE.Vector3(...wishFrame.center);
const DESK_LABELS = [new THREE.Vector3(2.13, LEVEL.upper + 1.12, -2.73)];

function WorldLabels({
  anchors,
  buttons,
  distanceFactor,
}: {
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
      const x = ((point.x + 1) * size.width) / 2;
      const y = ((1 - point.y) * size.height) / 2;
      const scale = THREE.MathUtils.clamp(distanceFactor / camera.position.distanceTo(anchor), 0.5, 1.2);
      button.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${scale})`;
    });
  });
  return null;
}

function SceneAtmosphere({ phase }: { phase: Phase }) {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    const isFlight = phase === 'flight';
    scene.background = new THREE.Color(isFlight ? '#030209' : '#dff3fd');
    scene.fog = null;
    return () => {
      scene.fog = null;
    };
  }, [scene, phase]);
  return null;
}

function SceneReady({ scene, onReady }: { scene: JourneyScene; onReady: (scene: JourneyScene) => void }) {
  useEffect(() => {
    onReady(scene);
  }, [scene, onReady]);
  return null;
}

function RoomScene({
  onBoard,
  onOpenWish,
  wishGallery,
  onReady,
}: {
  onBoard: () => void;
  onOpenWish?: (card: WishCard) => void;
  wishGallery: boolean;
  onReady: (scene: JourneyScene) => void;
}) {
  return (
    <group name="original-Nobita-room-preserved">
      <ambientLight intensity={1.05} color="#e8f6ff" />
      <hemisphereLight args={['#ffffff', '#b8c7ad', 1.35]} />
      <directionalLight
        position={[1.2, 9.4, -1.5]}
        color="#fff4de"
        intensity={1.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[2.4, LEVEL.upper + 1.88, -4.9]} intensity={5.6} distance={8} color="#fff0d1" />
      <pointLight position={[1.5, LEVEL.upper + 1.9, -3.2]} intensity={2.2} distance={6} color="#d4efff" />
      <Suspense fallback={null}>
        <HouseModel cutY={null} paving={false} />
        <SceneReady scene="room" onReady={onReady} />
      </Suspense>
      <Suspense fallback={null}>
        <WishWall onOpen={onOpenWish} />
      </Suspense>
      {!wishGallery && (
        <>
          {/* Exact desk coordinates from original src/editor/house/plan.ts, not a fake 2D overlay. */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: The canvas hotspot has a matching HTML button. */}
          <mesh
            name="interactive-nobita-desk-drawer"
            position={[2.13, LEVEL.upper + 0.55, -3.08]}
            onClick={(e) => {
              e.stopPropagation();
              onBoard();
            }}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = '';
            }}
          >
            <boxGeometry args={[1.05, 0.74, 0.6]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <group position={[2.13, LEVEL.upper + 0.72, -2.73]}>
            <mesh>
              <torusGeometry args={[0.18, 0.024, 12, 60]} />
              <meshBasicMaterial color="#42b7f5" toneMapped={false} />
            </mesh>
            <pointLight intensity={1.7} color="#89ddff" distance={2} />
          </group>
        </>
      )}
    </group>
  );
}

function CameraDirector({
  phase,
  ship,
  viewMode,
  wishGallery,
  paused,
  peek,
  lowMotion,
  station,
}: {
  phase: Phase;
  ship: { current: ShipPose };
  viewMode: ViewMode;
  wishGallery: boolean;
  paused: boolean;
  peek: number;
  lowMotion: boolean;
  station?: EventPlacement;
}) {
  const { camera, gl, size } = useThree();
  const reducedMotion = useReducedMotionRef();
  const wishEye = useMemo(() => {
    const halfView = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    const aspect = Math.max(0.1, size.width / Math.max(1, size.height));
    const heightFraction = aspect < 0.8 ? 0.69 : 0.74;
    const distance = Math.min(
      2.58,
      Math.max(
        wishFrame.height / (2 * halfView * heightFraction),
        wishFrame.width / (2 * halfView * aspect * 0.86),
      ) + 0.07,
    );
    return WISH_AIM.clone().add(new THREE.Vector3(-distance, 0, 0));
  }, [size.width, size.height]);
  const lookRef = useRef(DESK_AIM.clone());
  const initialDirection = DESK_AIM.clone().sub(ROOM_EYE).normalize();
  const orbit = useRef({
    yaw: Math.atan2(-initialDirection.x, -initialDirection.z),
    pitch: Math.asin(initialDirection.y),
    dragging: false,
    x: 0,
    y: 0,
  });
  const roomPosition = useRef(ROOM_EYE.clone());
  const roomKeys = useRef(new Set<string>());
  const direction = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    if (phase !== 'room' || wishGallery || paused) return;
    const down = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.closest('input,textarea,select,button') || e.target.isContentEditable)
      )
        return;
      if (
        ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)
      ) {
        e.preventDefault();
        roomKeys.current.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => {
      roomKeys.current.delete(e.code);
    };
    const clear = () => {
      roomKeys.current.clear();
      orbit.current.dragging = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      clear();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, [phase, wishGallery, paused]);
  useEffect(() => {
    if (phase !== 'room' || wishGallery || paused) return;
    const dom = gl.domElement;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      orbit.current.dragging = true;
      orbit.current.x = e.clientX;
      orbit.current.y = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!orbit.current.dragging) return;
      const o = orbit.current;
      o.yaw -= (e.clientX - o.x) * 0.0025;
      o.pitch = THREE.MathUtils.clamp(o.pitch - (e.clientY - o.y) * 0.0025, -1.35, 1.35);
      o.x = e.clientX;
      o.y = e.clientY;
    };
    const up = () => {
      orbit.current.dragging = false;
    };
    dom.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', up);
    return () => {
      orbit.current.dragging = false;
      dom.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', up);
    };
  }, [gl, phase, wishGallery, paused]);
  const currentView = useRef<Phase | null>(null);
  const flightEye = useMemo(() => new THREE.Vector3(), []);
  const flightAim = useMemo(() => new THREE.Vector3(), []);
  const focusBlend = useRef(0);
  const focusEye = useMemo(() => new THREE.Vector3(), []);
  const focusAim = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (phase !== 'flight') {
      const o = orbit.current;
      const viewingWishes = phase === 'room' && wishGallery;
      const keys = roomKeys.current;
      if (phase === 'room' && !viewingWishes && !paused) {
        const forward =
          Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
        const right =
          Number(keys.has('KeyD') || keys.has('ArrowRight')) -
          Number(keys.has('KeyA') || keys.has('ArrowLeft'));
        direction.set(
          -Math.sin(o.yaw) * forward + Math.cos(o.yaw) * right,
          0,
          -Math.cos(o.yaw) * forward - Math.sin(o.yaw) * right,
        );
        if (direction.lengthSq() > 0) roomPosition.current.addScaledVector(direction.normalize(), 1.8 * dt);
        roomPosition.current.x = THREE.MathUtils.clamp(
          roomPosition.current.x,
          ROOM_BOUNDS.x0 + 0.2,
          ROOM_BOUNDS.x1 - 0.2,
        );
        roomPosition.current.z = THREE.MathUtils.clamp(
          roomPosition.current.z,
          ROOM_BOUNDS.z0 + 0.2,
          ROOM_BOUNDS.z1 - 0.2,
        );
      }
      const pos = phase === 'boarding' ? ROOM_BOARD_EYE : viewingWishes ? wishEye : roomPosition.current;
      const aim = (phase === 'boarding' ? ROOM_BOARD_AIM : viewingWishes ? WISH_AIM : DESK_AIM).clone();
      if (phase === 'room' && !viewingWishes)
        aim
          .copy(pos)
          .add(
            direction.set(
              -Math.sin(o.yaw) * Math.cos(o.pitch),
              Math.sin(o.pitch),
              -Math.cos(o.yaw) * Math.cos(o.pitch),
            ),
          );
      const immediate = phase === 'room' && reducedMotion.current;
      camera.position.lerp(pos, immediate ? 1 : 1 - Math.exp(-3.8 * dt));
      lookRef.current.lerp(aim, immediate ? 1 : 1 - Math.exp(-6 * dt));
    } else {
      const { y, z } = ship.current.position;
      const front = viewMode === 'front';
      const narrow = size.width / Math.max(1, size.height) < 0.8;
      flightEye.set(
        peek * 1.8,
        y + (front ? 2.7 : 4.1),
        z + (front ? (narrow ? -12 : -8.7) : narrow ? 17 : 12),
      );
      flightAim.set(peek * 4.5, y + 0.9, z + (front ? 0 : -4));
      const immediate = lowMotion || reducedMotion.current;
      if (station) {
        const aspect = Math.max(0.24, size.width / Math.max(1, size.height));
        const tangent = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
        const distance = Math.max(
          station.width / (2 * tangent * aspect * 0.85),
          station.height / (2 * tangent * 0.72),
          6.8,
        );
        const targetY = station.y + (station.height - station.frameHeight) / 2 - 0.14;
        const stationZ = closestLoopZ(station.z, z);
        focusAim.set(station.x, targetY, stationZ);
        focusEye.set(
          station.side * Math.max(3.35, Math.abs(station.x) - distance * Math.abs(Math.sin(station.yaw))),
          targetY + 0.34,
          stationZ + distance * Math.cos(station.yaw) + 0.85,
        );
      }
      const blend = station ? 1 : 0;
      focusBlend.current = immediate ? blend : THREE.MathUtils.damp(focusBlend.current, blend, 5.6, dt);
      if (Math.abs(focusBlend.current - blend) < 0.002) focusBlend.current = blend;
      flightEye.lerp(focusEye, focusBlend.current);
      flightAim.lerp(focusAim, focusBlend.current);
      if (currentView.current !== 'flight' || immediate) {
        camera.position.copy(flightEye);
        lookRef.current.copy(flightAim);
      } else {
        camera.position.lerp(flightEye, 1 - Math.exp(-7 * dt));
        lookRef.current.lerp(flightAim, 1 - Math.exp(-8 * dt));
        if (!focusBlend.current) {
          camera.position.z = flightEye.z;
          lookRef.current.z = flightAim.z;
        }
      }
    }
    currentView.current = phase;
    camera.lookAt(lookRef.current);
  });
  return null;
}

function WebglError({ error }: { error: string }) {
  return (
    <div className="journey-error panel">
      <h2>Không hiển thị được cảnh 3D</h2>
      <p>{error}</p>
      <p>Hãy kiểm tra phần cứng WebGL2 hoặc mở Console (F12) để xem chi tiết.</p>
    </div>
  );
}

export default function TimeJourney() {
  const [phase, setPhase] = useState<Phase>('room');
  const [readyScene, setReadyScene] = useState<JourneyScene | null>(null);
  const [wishGallery, setWishGallery] = useState(false);
  const [wish, setWish] = useState<WishCard | null>(null);
  const [unlockedRecipients, setUnlockedRecipients] = useState<ReadonlySet<string>>(() => new Set());
  const [warp, setWarp] = useState(false);
  const [album, setAlbum] = useState<{ id: string; src?: string } | null>(null);
  const [inspection, setInspection] = useState<{ station: EventPlacement; src?: string } | null>(null);
  const pendingStation = useRef<{ station: EventPlacement; src?: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('chase');
  const [z, setZ] = useState(FLIGHT_START);
  const [autoFly, setAutoFly] = useState(false);
  const [peek, setPeek] = useState(0);
  const [lowMotion, setLowMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const reducedMotion = useReducedMotionRef();
  const flightInputLocked = useRef(false);
  const [error, setError] = useState('');
  const worldButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const ship = useRef<ShipPose>(newShip());
  const timers = useRef<number[]>([]);

  const stop = useCallback(() => {
    setAutoFly(false);
    pendingStation.current = null;
    stopFlight(ship.current);
  }, []);
  const board = useCallback(() => {
    if (phase !== 'room') return;
    setWishGallery(false);
    setWish(null);
    setAutoFly(!lowMotion && !reducedMotion.current);
    setPhase('boarding');
    setWarp(true);
    // A full-screen door glow conceals renderer handover; room itself does not move.
    timers.current.push(window.setTimeout(() => setPhase('flight'), 1400));
    timers.current.push(window.setTimeout(() => setWarp(false), 2080));
  }, [phase, lowMotion, reducedMotion]);
  const returnRoom = useCallback(() => {
    setAlbum(null);
    setInspection(null);
    setWarp(true);
    flightInputLocked.current = true;
    stop();
    timers.current.push(
      window.setTimeout(() => {
        setPhase('room');
        ship.current = newShip();
        setZ(FLIGHT_START);
        setPeek(0);
        setViewMode('chase');
        flightInputLocked.current = false;
      }, 600),
    );
    timers.current.push(window.setTimeout(() => setWarp(false), 1300));
  }, [stop]);
  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer);
    },
    [],
  );

  useEffect(() => {
    if (!wishGallery || wish) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWishGallery(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [wishGallery, wish]);

  const openAlbum = useCallback(
    (id: string, src?: string) => {
      if (flightInputLocked.current) return;
      stop();
      flightInputLocked.current = true;
      setAlbum({ id, src });
    },
    [stop],
  );
  const closeAlbum = useCallback(() => {
    flightInputLocked.current = false;
    setAlbum(null);
    setInspection(null);
  }, []);
  const inspectStation = useCallback(
    (station: EventPlacement, src?: string) => {
      if (flightInputLocked.current) return;
      stop();
      if (inspection?.station === station) {
        openAlbum(station.event.id, src);
      } else if (
        Math.abs(closestLoopZ(station.arrival, ship.current.position.z) - ship.current.position.z) <= 13
      ) {
        setInspection({ station, src });
      } else {
        pendingStation.current = { station, src };
        travelTo(ship.current, station.arrival, lowMotion || reducedMotion.current);
      }
    },
    [inspection, lowMotion, openAlbum, reducedMotion, stop],
  );
  const updatePosition = useCallback((next: number) => {
    setZ(next);
    const pending = pendingStation.current;
    if (pending && !ship.current.trip && Math.abs(closestLoopZ(pending.station.arrival, next) - next) < 0.1) {
      pendingStation.current = null;
      setInspection(pending);
    }
  }, []);
  const toggleView = useCallback(() => {
    setPeek(0);
    setViewMode((mode) => (mode === 'front' ? 'chase' : 'front'));
  }, []);
  useEffect(() => {
    if (phase !== 'flight' || album !== null) return;
    const down = (event: KeyboardEvent) => {
      if (flightInputLocked.current || event.altKey || event.ctrlKey || event.metaKey) return;
      if (inspection) {
        if (event.key === 'Escape') setInspection(null);
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('select,input,textarea,[contenteditable]')
      )
        return;
      if (['KeyW', 'KeyS', 'Space'].includes(event.code)) event.preventDefault();
      const current = ship.current;
      if (event.code === 'Space') stop();
      if (event.code === 'KeyE' && !event.repeat) {
        const station = nearbyStation(current.position.z);
        if (station) inspectStation(station);
      }
      if (event.code === 'KeyM' && !event.repeat) toggleView();
      if (event.code === 'KeyW' || event.code === 'KeyS') {
        if (event.repeat) return;
        setAutoFly(false);
        pendingStation.current = null;
        current.target = null;
        current.trip = null;
        current.keys.add(event.code);
      }
    };
    const up = (event: KeyboardEvent) => {
      ship.current.keys.delete(event.code);
    };
    const clear = stop;
    const wheel = (event: WheelEvent) => {
      if (
        flightInputLocked.current ||
        inspection ||
        event.ctrlKey ||
        !(event.target instanceof HTMLCanvasElement)
      )
        return;
      event.preventDefault();
      setAutoFly(false);
      const scale = event.deltaMode === 1 ? 0.8 : event.deltaMode === 2 ? 7 : 0.07;
      pendingStation.current = null;
      nudgeFlight(ship.current, THREE.MathUtils.clamp(event.deltaY * scale, -12, 12));
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    window.addEventListener('wheel', wheel, { passive: false });
    return () => {
      ship.current.keys.clear();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      window.removeEventListener('wheel', wheel);
    };
  }, [phase, album, inspection, inspectStation, stop, toggleView]);

  useEffect(() => {
    document.body.removeAttribute('aria-busy');
  }, []);
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (event.message) setError(event.message);
    };
    const onReject = (event: PromiseRejectionEvent) => {
      const reason = event.reason as unknown;
      setError(reason instanceof Error ? reason.message : String(reason));
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onReject);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onReject);
    };
  }, []);
  return (
    <main className="journey-app">
      <Canvas
        className="journey-canvas"
        shadows
        dpr={
          phase === 'flight'
            ? Math.min(window.devicePixelRatio, 1.5)
            : Math.min(window.devicePixelRatio * 1.6, 2.25)
        }
        camera={{ position: [ROOM_EYE.x, ROOM_EYE.y, ROOM_EYE.z], fov: CAMERA_FOV, near: 0.06, far: 250 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.NoToneMapping,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <SceneAtmosphere phase={phase} />
        <CameraDirector
          phase={phase}
          ship={ship}
          viewMode={viewMode}
          wishGallery={wishGallery}
          paused={wish !== null}
          peek={peek}
          lowMotion={lowMotion}
          station={inspection?.station}
        />
        {phase !== 'flight' && !wishGallery && (
          <WorldLabels anchors={DESK_LABELS} buttons={worldButtons} distanceFactor={3.6} />
        )}
        {phase !== 'flight' ? (
          <RoomScene
            onBoard={board}
            onOpenWish={phase === 'room' ? setWish : undefined}
            wishGallery={wishGallery}
            onReady={setReadyScene}
          />
        ) : (
          <Suspense fallback={null}>
            <TimeTunnel inspecting={inspection !== null} />
            <FlightScene
              lowMotion={lowMotion}
              autoFly={autoFly && !warp}
              ship={ship}
              locked={album !== null || inspection !== null || flightInputLocked.current}
              onPosition={updatePosition}
            />
            <MemoryExhibition focusId={inspection?.station.event.id} onSelect={inspectStation} />
            <SceneReady scene="flight" onReady={setReadyScene} />
          </Suspense>
        )}
      </Canvas>

      <div className="journey-ui">
        {phase === 'room' && !wishGallery && (
          <button
            type="button"
            className="journey-room-marker journey-world-label"
            onClick={board}
            ref={(element) => {
              worldButtons.current[0] = element;
            }}
            hidden
          >
            ✦ Mở ngăn bàn
          </button>
        )}
        {phase === 'room' && (
          <section className="journey-room-actions" aria-label="Phòng Nobita">
            {wishGallery && (
              <select
                aria-label="Chọn thiệp"
                className="journey-button"
                value=""
                onChange={(event) => {
                  setWish(cards.find((card) => card.id === Number(event.target.value)) ?? null);
                }}
              >
                <option value="" disabled>
                  Chọn thiệp
                </option>
                {cards.map((card) => (
                  <option value={card.id} key={card.id}>
                    Thiệp {card.id} · {card.recipient}
                  </option>
                ))}
              </select>
            )}
            {!wishGallery && (
              <button type="button" className="journey-button journey-button-primary" onClick={board}>
                Mở ngăn bàn · Lên cỗ máy
              </button>
            )}
            <button type="button" className="journey-button" onClick={() => setWishGallery((open) => !open)}>
              {wishGallery ? 'Về góc phòng' : 'Góc lời chúc'}
            </button>
          </section>
        )}
        {readyScene !== (phase === 'flight' ? 'flight' : 'room') && (
          <div className="journey-loading journey-loading-state" role="status">
            {phase === 'flight' ? 'Đang tải cỗ máy thời gian…' : 'Đang dựng phòng Nobita…'}
          </div>
        )}
        {phase === 'flight' && !warp && !inspection && (
          <MemoryNavigation
            z={z}
            view={viewMode}
            peek={peek}
            reduced={lowMotion}
            autoFly={autoFly}
            onAutoFly={() => {
              stop();
              if (!autoFly) setAutoFly(true);
            }}
            onReduced={(value) => {
              setLowMotion(value);
              if (value && autoFly) stop();
              if (value && ship.current.trip) travelTo(ship.current, ship.current.trip.to, true);
            }}
            onZone={(target) => {
              stop();
              setPeek(0);
              setViewMode('chase');
              travelTo(ship.current, target, lowMotion || reducedMotion.current);
            }}
            onMove={(distance) => {
              setAutoFly(false);
              pendingStation.current = null;
              nudgeFlight(ship.current, distance);
            }}
            onStop={stop}
            onView={toggleView}
            onPeek={(side) => {
              setViewMode('chase');
              setPeek((previous) => (previous === side ? 0 : side));
            }}
            onInspect={(id) => {
              const station = MEMORY_STATIONS.find(({ event }) => event.id === id);
              if (station) inspectStation(station);
              else openAlbum(id);
            }}
            onLegacy={() => openAlbum('legacy')}
            onReturn={returnRoom}
          />
        )}
        {inspection && (
          <section className="memory-focus-controls" aria-label={inspection.station.event.title}>
            <button type="button" onClick={() => setInspection(null)}>
              ← Tiếp tục bay
            </button>
            <button type="button" onClick={() => openAlbum(inspection.station.event.id)}>
              Xem album
            </button>
            {inspection.src && (
              <button type="button" onClick={() => openAlbum(inspection.station.event.id, inspection.src)}>
                {inspection.station.event.videos.some(({ src }) => src === inspection.src)
                  ? 'Xem video'
                  : 'Xem ảnh'}
              </button>
            )}
          </section>
        )}
      </div>
      <div className={`journey-warp ${warp ? 'visible' : ''}`} aria-hidden="true">
        <span>✧</span>
      </div>
      {album !== null && <Gallery eventId={album.id} selectedSrc={album.src} onClose={closeAlbum} />}
      {wish && phase === 'room' && (
        <WishDialog
          key={wish.id}
          card={wish}
          unlocked={unlockedRecipients.has(wish.recipient)}
          onUnlock={(recipient) => setUnlockedRecipients((current) => new Set([...current, recipient]))}
          onClose={() => setWish(null)}
        />
      )}
      {error && <WebglError error={error} />}
    </main>
  );
}
