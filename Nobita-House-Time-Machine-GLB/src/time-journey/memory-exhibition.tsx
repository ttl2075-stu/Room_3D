import { useFrame } from '@react-three/fiber';
import { memo, useRef, useState } from 'react';
import type { Group } from 'three';
import { MemoryBillboard, MemoryPhotoFrame } from './memory-frame';
import {
  closestLoopZ,
  type EventPlacement,
  FLIGHT_START,
  MEMORY_LAYOUT,
  MEMORY_STATIONS,
  TRACK_EDGE,
} from './memory-layout';

function StationRail({ width, bottom }: { width: number; bottom: number }) {
  return (
    <group position={[0, bottom, -0.18]}>
      <mesh>
        <boxGeometry args={[width + 0.22, 0.045, 0.16]} />
        <meshStandardMaterial color="#667182" metalness={0.58} roughness={0.4} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2 + 0.09), -0.15, 0]}>
          <boxGeometry args={[0.033, 0.28, 0.12]} />
          <meshStandardMaterial color="#667182" metalness={0.58} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function MemoryStation({
  station,
  worldZ,
  focused,
  visible,
  onSelect,
}: {
  station: EventPlacement;
  worldZ: number;
  focused: boolean;
  visible: boolean;
  onSelect: (station: EventPlacement, src?: string) => void;
}) {
  const { event, color, x, y, yaw, frames, width, frameHeight, titleY, titleHeight, side } = station;
  const bottom = -frameHeight / 2 - 0.17;
  const anchorLength = Math.abs(x) - TRACK_EDGE;
  const height = y + bottom;
  const info = [
    event.images.length && `${event.images.length} ảnh`,
    event.videos.length && `${event.videos.length} video`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <group position={[x, y, worldZ]} name={event.id} visible={visible}>
      <group position={[(-side * anchorLength) / 2, -y + 0.12, 0]}>
        <mesh>
          <boxGeometry args={[anchorLength, 0.035, 0.035]} />
          <meshBasicMaterial color="#65677c" />
        </mesh>
        <mesh position={[(-side * anchorLength) / 2, 0.025, 0]}>
          <sphereGeometry args={[0.085, 10, 6]} />
          <meshBasicMaterial color={focused ? '#fff3da' : color} />
        </mesh>
      </group>
      <mesh position={[0, bottom - height / 2, -0.18]}>
        <boxGeometry args={[0.05, height, 0.05]} />
        <meshStandardMaterial color="#50586a" metalness={0.5} roughness={0.38} />
      </mesh>
      <group rotation={[0, yaw, 0]}>
        <StationRail width={width} bottom={bottom} />
        {/* biome-ignore lint/a11y/noStaticElementInteractions: Stations are also selectable using the HUD. */}
        <group
          position={[0, titleY, 0.03]}
          onClick={
            visible
              ? (event3d) => {
                  event3d.stopPropagation();
                  onSelect(station);
                }
              : undefined
          }
        >
          <MemoryBillboard
            title={event.title}
            subtitle={info}
            width={width}
            height={titleHeight}
            color={color}
          />
        </group>
        {frames.map((frame) => (
          <MemoryPhotoFrame
            key={frame.media.src}
            frame={frame}
            color={color}
            polaroid={event.layout === 'collage'}
            onSelect={visible ? () => onSelect(station, frame.media.src) : undefined}
          />
        ))}
      </group>
    </group>
  );
}

function Exhibition({
  focusId,
  onSelect,
}: {
  focusId?: string;
  onSelect: (station: EventPlacement, src?: string) => void;
}) {
  const [band, setBand] = useState(Math.floor(FLIGHT_START / 8));
  const rail = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (rail.current) rail.current.position.z = camera.position.z;
    const next = Math.floor(camera.position.z / 8);
    if (next !== band) setBand(next);
  });
  const reference = band * 8;
  const worldZ = (z: number) => closestLoopZ(z, reference);
  const near = (z: number) => Math.abs(reference - worldZ(z)) < 47;
  return (
    <group name="memory-constellation-exhibition">
      <group ref={rail}>
        {[-TRACK_EDGE, TRACK_EDGE].map((x) => (
          <mesh key={x} position={[x, 0.12, 0]}>
            <boxGeometry args={[0.027, 0.035, 500]} />
            <meshBasicMaterial color="#535d75" />
          </mesh>
        ))}
      </group>
      {MEMORY_LAYOUT.map(
        ({ zone, start }, index) =>
          !focusId &&
          near(start) && (
            <group key={zone.id} position={[0, 6.8, worldZ(start - 3.7)]}>
              <MemoryBillboard
                title={zone.title}
                subtitle={`Khu ${index + 1} / ${MEMORY_LAYOUT.length}`}
                color={zone.color}
                width={3.8}
              />
            </group>
          ),
      )}
      {MEMORY_STATIONS.filter(({ z, event }) => near(z) || event.id === focusId).map((station) => (
        <MemoryStation
          key={station.event.id}
          station={station}
          worldZ={worldZ(station.z)}
          focused={station.event.id === focusId}
          visible={!focusId || station.event.id === focusId}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

export const MemoryExhibition = memo(Exhibition);
