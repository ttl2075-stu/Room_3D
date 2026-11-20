import { describe, expect, it } from 'vitest';
import { MEMORY_ZONES } from './memory-data';
import {
  buildMemoryLayout,
  closestLoopZ,
  FLIGHT_END,
  FLIGHT_START,
  LOOP_LENGTH,
  nearbyStation,
  STATION_STYLES,
  TRACK_EDGE,
  zoneAt,
} from './memory-layout';

const zones = buildMemoryLayout(MEMORY_ZONES);
const stations = zones.flatMap((zone) => zone.stops);

describe('constellation gallery', () => {
  it('keeps all seven zones and 26 albums and builds stations only for public media', () => {
    const events = zones.flatMap(({ zone }) => zone.events);
    expect(zones).toHaveLength(7);
    expect(new Set(events.map(({ id }) => id)).size).toBe(26);
    expect(stations).toHaveLength(
      events.filter(({ images, videos }) => images.length || videos.length).length,
    );
    expect(zones[0]?.start).toBe(FLIGHT_START);
    for (const [index, zone] of zones.entries()) {
      if (index > 0) expect(zone.start).toBe(zones[index - 1]?.end);
      for (const stop of zone.stops) {
        expect(stop.z + stop.span / 2).toBeLessThan(zone.start);
        expect(stop.z - stop.span / 2).toBeGreaterThan(zone.end);
      }
    }
  });

  it('uses all four layouts and keeps neighboring stations apart', () => {
    expect(new Set(stations.map(({ event }) => event.layout))).toEqual(new Set(Object.keys(STATION_STYLES)));
    for (const [index, station] of stations.entries()) {
      expect(Math.abs(station.x) - (Math.cos(station.yaw) * station.width) / 2).toBeGreaterThan(TRACK_EDGE);
      const next = stations[index + 1];
      if (!next) continue;
      expect(station.side).toBe(-next.side);
      expect(station.z - station.span / 2).toBeGreaterThan(next.z + next.span / 2);
    }
  });

  it('retains photo proportions and leaves space around each rotated frame', () => {
    for (const station of stations) {
      for (const [index, frame] of station.frames.entries()) {
        expect(frame.width / frame.height).toBeCloseTo(frame.media.width / frame.media.height, 8);
        for (const other of station.frames.slice(index + 1)) {
          expect(
            Math.abs(frame.x - other.x) > (frame.outerWidth + other.outerWidth) / 2 ||
              Math.abs(frame.y - other.y) > (frame.outerHeight + other.outerHeight) / 2,
          ).toBe(true);
        }
      }
    }
  });

  it('uses the curated featured image and falls back to the cover in an uncurated station', () => {
    const tamDao = stations.find(({ event }) => event.id === 'tam-dao');
    const opening = stations.find(({ event }) => event.id === 'opening');
    expect(tamDao?.frames[0]?.media.preview).toContain('ae20d1aa35c79ec0');
    expect(opening?.frames[0]?.media).toBe(opening?.event.cover);
    const widths = tamDao?.frames.map(({ width, height }) => width * height) ?? [];
    expect((widths[0] ?? 0) / widths.reduce((sum, area) => sum + area, 0)).toBeGreaterThan(0.6);
  });
});

describe('looping flight', () => {
  it('continues from the last zone into the first and wraps in reverse', () => {
    expect(zoneAt(FLIGHT_END + 0.5)).toBe(6);
    expect(zoneAt(FLIGHT_END - 0.5)).toBe(0);
    expect(zoneAt(FLIGHT_START + 0.5)).toBe(6);
    expect(zoneAt(FLIGHT_START - 2 * LOOP_LENGTH)).toBe(0);
  });

  it('places the next copy just across either side of the seam', () => {
    expect(closestLoopZ(FLIGHT_START - 3, FLIGHT_END + 1)).toBeCloseTo(FLIGHT_END - 3);
    expect(closestLoopZ(FLIGHT_END + 3, FLIGHT_START - 1)).toBeCloseTo(FLIGHT_START + 3);
    expect(nearbyStation(FLIGHT_START - LOOP_LENGTH)?.event.id).toBe(nearbyStation(FLIGHT_START)?.event.id);
  });
});
