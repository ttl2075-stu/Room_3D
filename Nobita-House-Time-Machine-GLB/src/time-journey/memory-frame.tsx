import { useEffect, useState } from 'react';
import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import type { MemoryMedia } from './memory-data';

type Preview = { texture: Texture; aspect: number };

function usePreview(src: string | undefined) {
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => {
    setPreview(null);
    if (!src) return;
    let texture: Texture | undefined;
    const image = new Image();
    image.onload = () => {
      texture = new CanvasTexture(image);
      texture.colorSpace = SRGBColorSpace;
      setPreview({ texture, aspect: image.naturalWidth / image.naturalHeight });
    };
    image.src = src;
    return () => {
      image.onload = null;
      texture?.dispose();
    };
  }, [src]);
  return preview;
}

export function MemoryBillboard({
  title,
  subtitle,
  color,
  width = 4.4,
}: {
  title: string;
  subtitle: string;
  color: string;
  width?: number;
}) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 276;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#10182c';
    ctx.fillRect(0, 0, 960, 276);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 960, 9);
    ctx.font = '600 66px system-ui';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f6f8ff';
    ctx.fillText(title, 38, 110, 884);
    ctx.fillStyle = color;
    ctx.font = '500 42px system-ui';
    ctx.fillText(subtitle, 38, 210, 884);
    const label = new CanvasTexture(canvas);
    label.colorSpace = SRGBColorSpace;
    setTexture(label);
    return () => label.dispose();
  }, [title, subtitle, color]);
  return (
    <mesh>
      <planeGeometry args={[width, (width * 276) / 960]} />
      <meshBasicMaterial
        key={texture ? 'ready' : 'placeholder'}
        map={texture}
        color={texture ? '#ffffff' : '#10182c'}
        toneMapped={false}
      />
    </mesh>
  );
}

export function MemoryPhotoFrame({
  media,
  color,
  width,
  height,
  hovered,
  polaroid,
}: {
  media?: MemoryMedia;
  color: string;
  width: number;
  height: number;
  hovered: boolean;
  polaroid: boolean;
}) {
  const preview = usePreview(media?.preview);
  const aspect = preview?.aspect ?? 1.5;
  const photoWidth = Math.min(width - 0.16, (height - 0.2) * aspect);
  const photoHeight = photoWidth / aspect;
  return (
    <group>
      <mesh>
        <boxGeometry args={[width + 0.08, height + 0.08, 0.09]} />
        <meshBasicMaterial
          color={hovered || media?.kind === 'video' ? color : polaroid ? '#eee7ef' : '#536181'}
        />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={polaroid ? '#fff4fa' : '#162039'} />
      </mesh>
      <mesh position={[0, polaroid ? 0.045 : 0, 0.06]}>
        <planeGeometry args={[photoWidth, photoHeight]} />
        <meshBasicMaterial
          key={preview ? 'ready' : 'placeholder'}
          map={preview?.texture}
          color={preview ? '#ffffff' : '#263657'}
          toneMapped={false}
        />
      </mesh>
      {!preview && (
        <mesh position={[0, 0, 0.07]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.24, 0.24]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
      {media?.kind === 'video' && preview && (
        <mesh position={[0, 0, 0.075]} rotation={[0, 0, Math.PI / 2]}>
          <circleGeometry args={[0.28, 3]} />
          <meshBasicMaterial color="#f7f9ff" />
        </mesh>
      )}
    </group>
  );
}
