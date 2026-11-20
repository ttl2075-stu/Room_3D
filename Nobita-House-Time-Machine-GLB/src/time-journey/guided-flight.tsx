import { useFrame } from '@react-three/fiber';
import { type RefObject, useRef } from 'react';
import { type Group, MathUtils, Vector3 } from 'three';
import { useReducedMotionRef } from '../utils/reduced-motion';
import { TimeMachine } from './machine';
import { closestLoopZ, FLIGHT_START } from './memory-layout';

const AUTO_SPEED = 5.5;

export interface ShipPose {
  position: Vector3;
  speed: number;
  keys: Set<string>;
  target: number | null;
  trip: { from: number; to: number; elapsed: number; duration: number } | null;
}

export function newShip(): ShipPose {
  return { position: new Vector3(0, 2, FLIGHT_START), speed: 0, keys: new Set(), target: null, trip: null };
}

export function stopFlight(ship: ShipPose) {
  ship.keys.clear();
  ship.target = null;
  ship.trip = null;
  ship.speed = 0;
}

export function nudgeFlight(ship: ShipPose, distance: number) {
  ship.trip = null;
  const base = ship.target ?? ship.position.z;
  ship.target = MathUtils.clamp(base - distance, ship.position.z - 18, ship.position.z + 18);
}

export function travelTo(ship: ShipPose, to: number, reduced: boolean) {
  stopFlight(ship);
  const from = ship.position.z;
  const destination = closestLoopZ(to, from);
  const distance = Math.abs(destination - from);
  if (reduced || distance <= 0.01) ship.position.z = destination;
  else ship.trip = { from, to: destination, elapsed: 0, duration: MathUtils.clamp(distance / 37, 0.8, 6) };
}

export function FlightScene({
  ship,
  lowMotion,
  autoFly,
  locked,
  onPosition,
}: {
  ship: RefObject<ShipPose>;
  locked: boolean;
  lowMotion: boolean;
  autoFly: boolean;
  onPosition: (z: number) => void;
}) {
  const group = useRef<Group>(null);
  const last = useRef(Number.NaN);
  const reduced = useReducedMotionRef();
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.1);
    const data = ship.current;
    const previous = data.position.z;
    if (!locked) {
      if (data.trip) {
        const trip = data.trip;
        trip.elapsed += delta;
        data.position.z = MathUtils.lerp(
          trip.from,
          trip.to,
          MathUtils.smootherstep(trip.elapsed, 0, trip.duration),
        );
        if (trip.elapsed >= trip.duration) {
          data.trip = null;
          data.speed = 0;
        }
      } else if (data.target !== null) {
        data.position.z = MathUtils.damp(previous, data.target, 5, dt);
        if (Math.abs(data.position.z - data.target) < 0.03) {
          data.position.z = data.target;
          data.target = null;
          data.speed = 0;
        }
      } else {
        const throttle = Number(data.keys.has('KeyW')) - Number(data.keys.has('KeyS'));
        const cruiseSpeed = autoFly ? AUTO_SPEED : 0;
        const desiredSpeed = throttle === 0 ? cruiseSpeed : throttle > 0 ? 13 : -9;
        data.speed = MathUtils.damp(data.speed, desiredSpeed, 5, dt);
        if (Math.abs(data.speed) < 0.02) data.speed = 0;
        data.position.z = previous - data.speed * dt;
      }
    }
    group.current.position.copy(data.position);
    group.current.position.y += lowMotion || reduced.current ? 0 : Math.sin(clock.elapsedTime * 1.85) * 0.065;
    if (
      Math.abs(last.current - data.position.z) >= 0.2 ||
      Number.isNaN(last.current) ||
      (!data.trip && data.target === null && data.speed === 0 && last.current !== data.position.z)
    ) {
      last.current = data.position.z;
      onPosition(last.current);
    }
  }, -2);
  return (
    <group ref={group} position={[0, 2, FLIGHT_START]}>
      <TimeMachine />
      <pointLight position={[0, -0.6, 1.3]} intensity={5.7} color="#76d7fa" distance={7} />
    </group>
  );
}
