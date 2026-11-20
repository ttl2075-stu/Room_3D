import { useLoader, useThree } from '@react-three/fiber';
import { useLayoutEffect, useState } from 'react';
import { SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { LEVEL, WALLS } from '../editor/house/plan';
import { cards, recipients, type WishCard } from './data';

const roomEast = WALLS.find(({ id }) => id === 'up-room-east');
export const wishFrame = {
  center: [(roomEast?.at ?? 3.64) - (roomEast?.thickness ?? .15) / 2, LEVEL.upper + 1.24, -4.17] as const,
  width: 1.03,
  height: 1.87,
  rail: .043,
};
const columns = 4;
const rows = 9;
const firstRow = (rows - Math.ceil(cards.length / columns)) / 2;
const innerWidth = wishFrame.width - 2 * wishFrame.rail;
const innerHeight = wishFrame.height - 2 * wishFrame.rail;
const cardWidth = .203;

function railPositions(width: number, height: number, rail: number, z: number) {
  return [
    { key: 'left', position: [(-width + rail) / 2, 0, z], size: [rail, height] },
    { key: 'right', position: [(width - rail) / 2, 0, z], size: [rail, height] },
    { key: 'top', position: [0, (height - rail) / 2, z], size: [width - 2 * rail, rail] },
    { key: 'bottom', position: [0, (-height + rail) / 2, z], size: [width - 2 * rail, rail] },
  ] as const;
}

const wires = (() => {
  const points: number[] = [];
  for (let x = 0; x < innerWidth / 2; x += .035) {
    for (const side of x ? [-1, 1] : [1]) {
      points.push(x * side, -innerHeight / 2, 0, x * side, innerHeight / 2, 0);
    }
  }
  for (let y = 0; y < innerHeight / 2; y += .035) {
    for (const side of y ? [-1, 1] : [1]) {
      points.push(-innerWidth / 2, y * side, 0, innerWidth / 2, y * side, 0);
    }
  }
  return new Float32Array(points);
})();

const artwork = cards.map((card) => card.image);

function Frame({ wood }: { wood: Texture }) {
  const { width, height, rail } = wishFrame;
  return (
    <>
      <mesh position={[0, 0, .016]}>
        <boxGeometry args={[width, height, .026]} />
        <meshStandardMaterial color="#4c4841" roughness={1} />
      </mesh>
      <lineSegments position={[0, 0, .035]}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[wires, 3]} /></bufferGeometry>
        <lineBasicMaterial color="#9a9a88" transparent opacity={.5} />
      </lineSegments>
      {railPositions(width, height, rail, .04).map(({ key, position, size }) => (
        <mesh key={key} position={position}>
          <boxGeometry args={[...size, .06]} />
          <meshStandardMaterial color="#845639" map={wood} roughness={.9} />
        </mesh>
      ))}
      {railPositions(width - .04, height - .04, .012, .069).map(({ key, position, size }) => (
        <mesh key={key} position={position}>
          <boxGeometry args={[...size, .012]} />
          <meshStandardMaterial color="#80553d" roughness={.82} />
        </mesh>
      ))}
    </>
  );
}

function WallCard({ card, index, texture, onOpen }: {
  card: WishCard; index: number; texture: Texture; onOpen?: (card: WishCard) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const canvas = useThree((state) => state.gl.domElement);
  const interactive = Boolean(onOpen);
  useLayoutEffect(() => {
    if (!hovered || !interactive) return;
    const previous = canvas.style.cursor;
    canvas.style.cursor = 'pointer';
    return () => { canvas.style.cursor = previous; };
  }, [canvas, hovered, interactive]);

  const image = texture.image as HTMLImageElement;
  const height = cardWidth * image.height / image.width;
  const x = (index % columns + .5) * innerWidth / columns - innerWidth / 2;
  const y = innerHeight / 2 - (firstRow + Math.floor(index / columns) + .5) * innerHeight / rows;
  return (
    <group
      position={[x, y, hovered && onOpen ? .067 : .054]}
      onPointerOver={onOpen ? (event) => { event.stopPropagation(); setHovered(true); } : undefined}
      onPointerOut={onOpen ? () => setHovered(false) : undefined}
      onClick={onOpen ? (event) => { event.stopPropagation(); if (event.delta <= 4) onOpen(card); } : undefined}
    >
      <mesh>
        <planeGeometry args={[cardWidth + .008, height + .008]} />
        <meshBasicMaterial color={hovered && onOpen ? '#8de1ff' : '#f4e9d7'} />
      </mesh>
      <mesh position={[0, 0, .002]}>
        <planeGeometry args={[cardWidth, height]} />
        <meshBasicMaterial map={texture} alphaTest={.45} toneMapped={false} />
      </mesh>
      <mesh position={[0, height / 2 + .008, .009]}>
        <boxGeometry args={[.023, .033, .011]} />
        <meshStandardMaterial color={recipients[card.recipient].pinColor} roughness={.87} />
      </mesh>
    </group>
  );
}

export function WishWall({ onOpen }: { onOpen?: (card: WishCard) => void }) {
  const textures = useLoader(TextureLoader, artwork);
  const wood = useLoader(TextureLoader, '/textures/editor/wood-albedo.webp');
  useLayoutEffect(() => {
    for (const texture of [...textures, wood]) {
      if (texture.colorSpace === SRGBColorSpace) continue;
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;
    }
  }, [textures, wood]);
  return (
    <group name="wish-frame" position={wishFrame.center} rotation={[0, -Math.PI / 2, 0]}>
      <Frame wood={wood} />
      {cards.map((card, index) => {
        const texture = textures[index];
        return texture && <WallCard key={card.id} card={card} index={index} texture={texture} onOpen={onOpen} />;
      })}
    </group>
  );
}
