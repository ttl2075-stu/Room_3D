import { Canvas } from '@react-three/fiber';
import { MotionConfig, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { NoToneMapping, SRGBColorSpace } from 'three';
import { config } from './config';
import { characters } from './data/characters';
import { roomById } from './data/rooms';
import { PerfProbe } from './scene/perf-probe';
import { Scene } from './scene/scene';
import { preflightModels, useAppStore } from './state/store';
import { PerfStats, Roster, Title, ViewControls } from './ui/chrome';
import { InfoCard } from './ui/info-card';
import { LoadingVeil } from './ui/loading-veil';
import { MenusToggle } from './ui/menus-toggle';
import { type PlacedPin, RoomPins, RoomPinTracker } from './ui/room-pins';

const modelUrls = [
  config.models.environment,
  config.models.streets,
  config.models.neighbours,
  config.models.tree,
  config.models.hedge,
  config.models.sakura,
  ...characters.map((c) => `${config.models.characterDir}/${c.id}.glb`),
];

export function App() {
  (window as unknown as Record<string, unknown>).__appProbe = {
    models: useAppStore((st) => st.availableModels),
    preflightDone: useAppStore((st) => st.preflightDone),
  };
  const [menusOpen, setMenusOpen] = useState(true);
  /** Screen positions of the room's hotspot pins, published from inside the Canvas. */
  const [pins, setPins] = useState<PlacedPin[]>([]);
  const room = useAppStore((s) => (s.activeRoomId ? roomById(s.activeRoomId) : undefined));
  const showPerf = useAppStore((s) => s.showPerf);

  useEffect(() => {
    document.body.setAttribute('aria-busy', 'true');
    preflightModels(modelUrls);
  }, []);

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [...config.camera.position], fov: config.camera.fov, near: 0.1, far: 200 }}
        // Neutral tone mapping keeps Doraemon blue saturated; filmic curves mud the palette.
        gl={{ antialias: true, toneMapping: NoToneMapping, outputColorSpace: SRGBColorSpace }}
        role="img"
        aria-label={
          room
            ? `Inside Nobita's house from Doraemon, standing in one room: ${room.name} (${room.kana}).`
            : "Nobita's house from Doraemon seen from the street: a two-storey cream house under red tile roofs behind a concrete block wall, with Doraemon, Nobita, Shizuka, Gian, Suneo and Dekisugi gathered round the gate, Nobita sitting on the ground in front of it."
        }
      >
        <Scene />
        <RoomPinTracker onPlace={setPins} />
        {showPerf && <PerfProbe />}
      </Canvas>
      <div id="ui-root">
        {/* Hidden menus stay mounted (unmounting the toolbar would stop the music): they fade out,
            then become invisible and inert so they drop out of the tab order and hit testing. */}
        <MotionConfig reducedMotion="user">
          <motion.div
            id="main-menus"
            className="menus"
            inert={!menusOpen}
            initial={false}
            animate={
              menusOpen
                ? { opacity: 1, visibility: 'visible' }
                : { opacity: 0, transitionEnd: { visibility: 'hidden' } }
            }
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="top-left">
              <Title />
              {showPerf && <PerfStats />}
            </div>
            <ViewControls />
            {/* Inside the room the roster is dead weight: the characters are out on the
                street and selecting one there is a no-op, because a character flight from
                inside would fly the camera out through a wall. The toolbar stays — the time
                of day still reaches the room through its window, and the music never stops. */}
            {!room && <Roster />}
          </motion.div>
          <MenusToggle
            open={menusOpen}
            onToggle={() => setMenusOpen((open) => !open)}
            controls="main-menus"
          />
        </MotionConfig>
        <InfoCard />
        <RoomPins placed={pins} />
      </div>
      <LoadingVeil />
    </>
  );
}
