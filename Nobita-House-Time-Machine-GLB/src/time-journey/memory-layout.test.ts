import { describe, expect, it } from 'vitest';
import { MEMORY_ZONES } from './memory-data';
import { buildMemoryLayout, FLIGHT_START } from './memory-layout';

describe('continuous exhibition', () => {
  it('has seven contiguous zones and 26 unique events', () => {
    const zones = buildMemoryLayout(MEMORY_ZONES);
    const events = zones.flatMap((zone) => zone.stops.map((stop) => stop.event.id));
    expect(zones).toHaveLength(7);
    expect(new Set(events).size).toBe(26);
    expect(events).toHaveLength(26);
    expect(zones[0]?.start).toBe(FLIGHT_START);
    for (const [index, zone] of zones.entries()) {
      expect(zone.end).toBeLessThan(zone.start);
      if (index > 0) expect(zone.start).toBe(zones[index - 1]?.end);
      for (const [stopIndex, stop] of zone.stops.entries()) {
        const next = zone.stops[stopIndex + 1];
        if (next) expect(stop.z - stop.span / 2).toBeGreaterThan(next.z + next.span / 2);
        expect(stop.z + stop.span / 2).toBeLessThan(zone.start);
        expect(stop.z - stop.span / 2).toBeGreaterThan(zone.end);
      }
    }
  });
  it('adds room for additional previews in a small zone', () => {
    const base = MEMORY_ZONES[0];
    const source = base?.events[0];
    const image = source?.images[0];
    if (!base || !source || !image) throw new Error('Missing fixture media');
    const shortZone = { ...base, length: 1 };
    const [empty] = buildMemoryLayout([
      { ...shortZone, events: [{ ...source, cover: undefined, images: [] }] },
    ]);
    const [full] = buildMemoryLayout([
      {
        ...shortZone,
        events: [
          {
            ...source,
            images: Array.from({ length: 24 }, (_, index) => ({ ...image, src: `${image.src}?${index}` })),
          },
        ],
      },
    ]);
    expect(full?.stops[0]?.span).toBeGreaterThan(empty?.stops[0]?.span ?? 0);
    expect(full?.end).toBeLessThan(empty?.end ?? 0);
  });
});
