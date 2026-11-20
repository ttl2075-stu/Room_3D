import { MEMORY_ZONES, type MemoryZone } from './memory-data';

export const FLIGHT_START = 6;
const ZONE_PADDING = 6;
const EVENT_GAP = 3;

export function buildMemoryLayout(zones: MemoryZone[]) {
  let start = FLIGHT_START;
  return zones.map((zone) => {
    let cursor = start - ZONE_PADDING;
    const stops = zone.events.map((event, index) => {
      const count = event.images.length + event.videos.length;
      const slots = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(count))));
      const samples = event.cover
        ? [
            event.cover,
            ...event.videos.filter((item) => item !== event.cover),
            ...event.images.filter((item) => item !== event.cover),
          ].slice(0, slots)
        : [];
      const span = Math.max(7, 4 * Math.ceil((samples.length + 1) / 2));
      const z = cursor - span / 2;
      cursor -= span + EVENT_GAP;
      return { event, z, span, samples, side: index % 2 === 0 ? -1 : 1 };
    });
    const end = Math.min(start - zone.length, cursor - ZONE_PADDING);
    const placement = { zone, start, end, stops, arrival: (stops[0]?.z ?? start - ZONE_PADDING) + 4 };
    start = end;
    return placement;
  });
}

export const MEMORY_LAYOUT = buildMemoryLayout(MEMORY_ZONES);
export const FLIGHT_END = MEMORY_LAYOUT.at(-1)?.end ?? FLIGHT_START;
export type ZonePlacement = (typeof MEMORY_LAYOUT)[number];
export type EventPlacement = ZonePlacement['stops'][number];

export function zoneAt(z: number) {
  const index = MEMORY_LAYOUT.findIndex(({ end }) => z > end);
  return index < 0 ? MEMORY_LAYOUT.length - 1 : index;
}
