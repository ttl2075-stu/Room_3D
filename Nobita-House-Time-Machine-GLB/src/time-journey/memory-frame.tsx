import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';
import type { EventPlacement } from './memory-layout';

function usePreview(src: string) {
  const anisotropy = useThree(({ gl }) => Math.min(8, gl.capabilities.getMaxAnisotropy()));
  const [preview, setPreview] = useState<CanvasTexture<HTMLImageElement> | null>(null);
  useEffect(() => {
    let texture: CanvasTexture<HTMLImageElement> | undefined;
    const image = new Image();
    image.onload = () => {
      texture = new CanvasTexture(image);
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.magFilter = LinearFilter;
      texture.anisotropy = anisotropy;
      setPreview(texture);
    };
    image.src = src;
    return () => {
      image.onload = null;
      texture?.dispose();
    };
  }, [src, anisotropy]);
  return preview;
}

export function MemoryBillboard({
  title,
  subtitle,
  color,
  width,
  height = width * 0.16,
}: {
  title: string;
  subtitle: string;
  color: string;
  width: number;
  height?: number;
}) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 205;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.shadowColor = '#090c18';
    ctx.shadowBlur = 12;
    ctx.textBaseline = 'middle';
    ctx.font = '700 91px "Times New Roman", "Noto Serif", serif';
    ctx.fillStyle = '#fffbf1';
    ctx.fillText(title, 9, 70, 1258);
    ctx.fillStyle = color;
    ctx.fillRect(12, 145, 47, 4);
    ctx.font = '600 41px system-ui';
    ctx.fillText(subtitle, 77, 148, 1181);
    const label = new CanvasTexture(canvas);
    label.colorSpace = SRGBColorSpace;
    setTexture(label);
    return () => label.dispose();
  }, [title, subtitle, color]);
  return (
    texture && (
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    )
  );
}

export function MemoryPhotoFrame({
  frame,
  color,
  polaroid,
  onSelect,
}: {
  frame: EventPlacement['frames'][number];
  color: string;
  polaroid: boolean;
  onSelect?: () => void;
}) {
  const { media, featured, x, y, width, height, matWidth, matHeight, depth, rotation } = frame;
  const preview = usePreview(featured ? (media.featurePreview ?? media.preview) : media.preview);
  const [hovered, setHovered] = useState(false);
  const canvas = useThree(({ gl }) => gl.domElement);
  useEffect(() => {
    if (!hovered || !onSelect) return;
    canvas.style.cursor = 'pointer';
    return () => {
      canvas.style.cursor = '';
    };
  }, [canvas, hovered, onSelect]);
  if (!preview) return null;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The HUD exposes the same station and album.
    <group
      position={[x, y, depth]}
      rotation={[0, 0, rotation]}
      onPointerOver={
        onSelect
          ? (event) => {
              event.stopPropagation();
              setHovered(true);
            }
          : undefined
      }
      onPointerOut={() => setHovered(false)}
      onClick={
        onSelect
          ? (event) => {
              event.stopPropagation();
              onSelect();
            }
          : undefined
      }
    >
      <mesh position={[0, -0.023, -0.022]}>
        <planeGeometry args={[matWidth + 0.03, matHeight + 0.04]} />
        <meshBasicMaterial color="#070b16" transparent opacity={0.7} />
      </mesh>
      <mesh>
        <planeGeometry args={[matWidth, matHeight]} />
        <meshBasicMaterial color={hovered ? color : polaroid ? '#f2e8d8' : '#808a9a'} />
      </mesh>
      <mesh position={[0, polaroid ? 0.043 : 0, 0.009]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={preview} toneMapped={false} />
      </mesh>
      {media.kind === 'video' && (
        <group position={[width / 2 - 0.23, -height / 2 + 0.22, 0.019]}>
          <mesh>
            <circleGeometry args={[0.14, 24]} />
            <meshBasicMaterial color="#171c27" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0.014, 0, 0.004]}>
            <circleGeometry args={[0.073, 3]} />
            <meshBasicMaterial color="#fff7e6" />
          </mesh>
        </group>
      )}
    </group>
  );
}
