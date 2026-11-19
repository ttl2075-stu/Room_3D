import { Html, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type Group, Plane, Vector3 } from 'three';
import type { EditorLevel } from '../levels';
import { buildFurniture } from './build-furniture';
import { buildRoofs } from './build-roof';
import { buildDoors, buildShell } from './build-shell';
import { CLICK_THROUGH, Doors } from './doors';
import {
  createCapMaterial,
  createMaterials,
  prepareTile,
  specOf,
  TILE_NAMES,
  type TileName,
  type TileTextures,
  tileUrl,
} from './materials';
import { MeshBatch } from './mesh-batch';
import { ROOMS, roomAt, STOREYS, type StoreyId } from './plan';

const TILE_URLS = Object.fromEntries(
  TILE_NAMES.flatMap((tile) => [
    [`${tile}-albedo`, tileUrl(tile, 'albedo')],
    [`${tile}-normal`, tileUrl(tile, 'normal')],
  ]),
);

/**
 * Nobita's house as built from `plan.ts`: every board, wall and chair derived from the plan
 * data, merged into one mesh per material; each door leaf apart, so a click opens it, and
 * `openDoor` opens one for a view through it. `cutY` clips everything above it, shadows
 * included, and the section cap paints the cut walls solid. `paving` draws the editor's walk
 * from the porch toward the gate, which the diorama's lot lays its own path for.
 */
export function HouseModel({
  cutY,
  openDoor,
  paving,
}: {
  cutY: number | null;
  openDoor?: string;
  paving: boolean;
}) {
  const textures = useTexture(TILE_URLS);
  const gl = useThree((s) => s.gl);
  const root = useRef<Group>(null);

  const house = useMemo(() => {
    const tiles = {} as TileTextures;
    for (const tile of TILE_NAMES as readonly TileName[]) {
      const albedo = textures[`${tile}-albedo`];
      const normal = textures[`${tile}-normal`];
      if (!albedo || !normal) throw new Error(`tile "${tile}" did not load`);
      prepareTile(albedo, true);
      prepareTile(normal, false);
      // Sharpen surface detail viewed at oblique angles, without altering the original house mesh.
      const anisotropy = Math.min(12, gl.capabilities.getMaxAnisotropy());
      albedo.anisotropy = anisotropy;
      normal.anisotropy = anisotropy;
      tiles[tile] = { albedo, normal };
    }
    const batch = MeshBatch.create();
    buildShell(batch, { paving });
    buildRoofs(batch);
    buildFurniture(batch);
    return {
      ...batch.build(),
      doors: buildDoors(),
      materials: createMaterials(tiles),
      capMaterial: createCapMaterial(),
    };
  }, [textures, paving]);

  useEffect(
    () => () => {
      for (const part of house.parts) part.geometry.dispose();
      house.cap.dispose();
      for (const leaf of house.doors.flatMap((door) => door.leaves)) {
        for (const part of leaf.parts) part.geometry.dispose();
        leaf.cap.dispose();
      }
      for (const material of Object.values(house.materials)) material.dispose();
      house.capMaterial.dispose();
    },
    [house],
  );

  useEffect(() => {
    gl.localClippingEnabled = true;
    const planes = cutY === null ? null : [new Plane(new Vector3(0, -1, 0), cutY)];
    for (const material of [...Object.values(house.materials), house.capMaterial]) {
      material.clippingPlanes = planes;
      // Without this a clipped roof or wall top would still shade the rooms it no longer covers.
      material.clipShadows = true;
    }
  }, [gl, house, cutY]);

  return (
    <group name="nobita-house" ref={root}>
      {house.parts.map(({ material, geometry }) => {
        const seeThrough = specOf(material).seeThrough;
        return (
          <mesh
            key={material}
            name={material}
            geometry={geometry}
            material={house.materials[material]}
            castShadow={!seeThrough}
            receiveShadow
            userData={seeThrough ? CLICK_THROUGH : undefined}
          />
        );
      })}
      <mesh name="section-cap" geometry={house.cap} material={house.capMaterial} userData={CLICK_THROUGH} />
      <Doors
        doors={house.doors}
        materials={house.materials}
        capMaterial={house.capMaterial}
        root={root}
        cutY={cutY}
        opened={openDoor}
      />
    </group>
  );
}

const STOREY_ORDER: readonly StoreyId[] = ['ground', 'upper'];

/**
 * Each shown room's name over the middle of its largest rectangle, floated just above the
 * tallest thing standing in its storey — the wall tops, or the cut — so it never sits inside a
 * wall at any angle. A downstairs room with an upstairs room over its label is not labelled:
 * its name would float over the room above. The stairwell, a hole, has no label.
 */
export function RoomLabels({ level }: { level: EditorLevel }) {
  return (
    <group name="room-labels">
      {ROOMS.map((room) => {
        if (room.floor === 'void' || !level.storeys.includes(room.storey)) return null;
        const rect = [...room.rects].sort(
          (a, b) => (b.x1 - b.x0) * (b.z1 - b.z0) - (a.x1 - a.x0) * (a.z1 - a.z0),
        )[0];
        if (!rect) return null;
        const x = (rect.x0 + rect.x1) / 2;
        const z = (rect.z0 + rect.z1) / 2;
        const above = STOREY_ORDER.slice(STOREY_ORDER.indexOf(room.storey) + 1);
        if (above.some((s) => level.storeys.includes(s) && roomAt(x, z, s))) return null;
        const y = Math.min(level.cutY ?? Number.POSITIVE_INFINITY, STOREYS[room.storey].top) + 0.15;
        return (
          <Html key={room.id} position={[x, y, z]} center zIndexRange={[5, 0]} className="room-label">
            <span>{room.name}</span>
            <small lang="ja">{room.kana}</small>
          </Html>
        );
      })}
    </group>
  );
}
