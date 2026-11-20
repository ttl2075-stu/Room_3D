import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useState } from 'react';
import { MemoryBillboard, MemoryPhotoFrame } from './memory-frame';
import { type EventPlacement, FLIGHT_END, FLIGHT_START, MEMORY_LAYOUT } from './memory-layout';

const stops = MEMORY_LAYOUT.flatMap(({ stops, zone }) =>
  stops.map((stop) => ({ ...stop, color: zone.color })),
);
const frameSizes = {
  gallery: [2.12, 1.4],
  research: [1.72, 1.8],
  showcase: [2.48, 1.73],
  landscape: [2.64, 1.45],
  polaroid: [2.12, 1.67],
  milestone: [2.55, 1.52],
  screens: [1.65, 1.4],
} as const;

type OpenEvent = (eventId: string, src?: string) => void;

function MemoryEvent({ stop, onOpen }: { stop: EventPlacement & { color: string }; onOpen: OpenEvent }) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);
  const { event, samples, color, side, z } = stop;
  const polaroid = event.layout === 'polaroid';
  const count = event.images.length + event.videos.length;
  const frames = samples.length ? samples : [undefined];
  const columns = Math.min(3, frames.length);
  const [width, height] = frameSizes[event.layout];
  return (
    <group
      position={[side * 7.6, 3.22, z]}
      rotation={[0, side * -0.67, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: The album selector provides keyboard access. */}
      <group
        position={[0, 1.56, 0.08]}
        onClick={(event3d) => {
          event3d.stopPropagation();
          onOpen(event.id);
        }}
      >
        <MemoryBillboard
          title={event.title}
          subtitle={
            count ? `${event.images.length} ảnh · ${event.videos.length} video` : 'Chưa có ảnh triển lãm'
          }
          color={color}
        />
      </group>
      {frames.map((item, index) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: The same photos are available via the album selector.
        <group
          key={item?.src ?? event.id}
          position={[
            ((index % columns) - (columns - 1) / 2) * (width + 0.23),
            -0.08 - Math.floor(index / columns) * (height + 0.19),
            0,
          ]}
          rotation={[0, 0, polaroid ? (index % 2 ? 0.035 : -0.035) : 0]}
          onClick={(event3d) => {
            event3d.stopPropagation();
            onOpen(event.id, item?.src);
          }}
        >
          <MemoryPhotoFrame
            media={item}
            color={color}
            width={width}
            height={height}
            hovered={hovered}
            polaroid={polaroid}
          />
        </group>
      ))}
    </group>
  );
}

function Exhibition({ onOpen }: { onOpen: OpenEvent }) {
  const [band, setBand] = useState(Math.floor(FLIGHT_START / 8));
  useFrame(({ camera }) => {
    const next = Math.floor(camera.position.z / 8);
    if (next !== band) setBand(next);
  });
  const near = (z: number) => Math.abs(band * 8 - z) < 38;
  return (
    <group name="continuous-memory-exhibition">
      {[-4.3, 4.3].map((x) => (
        <mesh key={x} position={[x, 0.1, (FLIGHT_START + FLIGHT_END) / 2]}>
          <boxGeometry args={[0.035, 0.035, FLIGHT_START - FLIGHT_END]} />
          <meshBasicMaterial color="#455789" />
        </mesh>
      ))}
      {MEMORY_LAYOUT.map(
        ({ zone, start }, index) =>
          near(start) && (
            <group key={zone.id} position={[0, 7.1, start - 3]}>
              <MemoryBillboard
                title={zone.title}
                subtitle={`Khu ${index + 1} / ${MEMORY_LAYOUT.length}`}
                color={zone.color}
                width={4.8}
              />
            </group>
          ),
      )}
      {stops
        .filter(({ z }) => near(z))
        .map((stop) => (
          <MemoryEvent key={stop.event.id} stop={stop} onOpen={onOpen} />
        ))}
      {near(FLIGHT_END) && (
        <group position={[0, 5.4, FLIGHT_END - 4]}>
          <MemoryBillboard title="Kết thúc hành trình" subtitle="Memory Time Gallery" color="#82eef7" />
        </group>
      )}
    </group>
  );
}

export const MemoryExhibition = memo(Exhibition);
