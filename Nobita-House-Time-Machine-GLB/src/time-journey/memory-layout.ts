import { MEMORY_ZONES, type MemoryEvent, type MemoryMedia, type MemoryZone } from './memory-data';

export const FLIGHT_START = 6;
export const TRACK_EDGE = 3.8;
const ZONE_PADDING = 8;

export const STATION_STYLES = {
  hero: {
    main: [5.4, 3.15],
    thumbnail: [1.85, 1.08],
    gap: 0.24,
    depth: 0.05,
    elevation: 3.6,
    titleGap: 0.17,
    clearance: 2.4,
    max: 4,
    tilt: 0,
    mat: 0.046,
  },
  editorial: {
    main: [3.2, 2.55],
    thumbnail: [2.65, 2.27],
    gap: 0.33,
    depth: 0,
    elevation: 3.68,
    titleGap: 0.21,
    clearance: 2.7,
    max: 3,
    tilt: 0,
    mat: 0.047,
  },
  collage: {
    main: [4.1, 3.22],
    thumbnail: [1.58, 1.32],
    gap: 0.24,
    depth: 0.13,
    elevation: 3.65,
    titleGap: 0.19,
    clearance: 2.55,
    max: 5,
    tilt: 0.043,
    mat: 0.086,
  },
  showcase: {
    main: [4.7, 3.38],
    thumbnail: [1.66, 1.22],
    gap: 0.23,
    depth: 0.08,
    elevation: 3.65,
    titleGap: 0.21,
    clearance: 2.55,
    max: 5,
    tilt: 0,
    mat: 0.065,
  },
} as const;

function mediaFor(event: MemoryEvent) {
  const media = [...event.images, ...event.videos];
  const byId = (id: string | undefined) => media.find((item) => item.preview === `/memories/${id}.webp`);
  const featured = byId(event.featuredMediaId) ?? event.cover ?? media[0];
  const curated = (event.previewMediaIds ?? []).map(byId).filter((item) => item !== undefined);
  const rest = event.layout === 'showcase' ? [...event.videos, ...event.images] : media;
  return featured ? [...new Set([featured, ...curated, ...rest])] : [];
}

function measureFrames(event: MemoryEvent, media: MemoryMedia[]) {
  const style = STATION_STYLES[event.layout];
  const frames = media.slice(0, style.max).map((item, index) => {
    const featured = index === 0;
    const [maxWidth, maxHeight] = featured ? style.main : style.thumbnail;
    const aspect = item.width / item.height;
    const width = Math.min(maxWidth, maxHeight * aspect);
    const height = width / aspect;
    const rotation = style.tilt * (index % 2 ? 1 : -1) * (featured ? 0.45 : 1);
    const matWidth = width + style.mat * 2;
    const matHeight = height + style.mat * (event.layout === 'collage' ? 3.1 : 2);
    const outerWidth = matWidth * Math.cos(rotation) + matHeight * Math.abs(Math.sin(rotation));
    const outerHeight = matHeight * Math.cos(rotation) + matWidth * Math.abs(Math.sin(rotation));
    return {
      media: item,
      featured,
      width,
      height,
      matWidth,
      matHeight,
      outerWidth,
      outerHeight,
      rotation,
      depth: featured ? style.depth : -style.depth * (index % 2),
      x: 0,
      y: 0,
    };
  });
  const [featured, ...others] = frames;
  if (featured && event.layout === 'editorial') {
    let cursor = 0;
    for (const frame of others.length > 1 ? [others[0], featured, ...others.slice(1)] : frames) {
      if (!frame) continue;
      frame.x = cursor + frame.outerWidth / 2;
      // Align the lower edge like prints mounted along a single gallery rail.
      frame.y = frame.outerHeight / 2;
      cursor += frame.outerWidth + style.gap;
    }
  } else if (featured) {
    const columns =
      event.layout === 'hero' || others.length < 3 ? [others] : [others.slice(0, 2), others.slice(2)];
    let cursor = featured.outerWidth / 2 + style.gap;
    for (const column of columns) {
      const width = Math.max(0, ...column.map((frame) => frame.outerWidth));
      const height = column.reduce((sum, frame) => sum + frame.outerHeight + style.gap, -style.gap);
      let top = height / 2;
      for (const frame of column) {
        frame.x = cursor + width / 2;
        frame.y = top - frame.outerHeight / 2;
        top -= frame.outerHeight + style.gap;
      }
      cursor += width + style.gap;
    }
  }

  const left = Math.min(...frames.map(({ x, outerWidth }) => x - outerWidth / 2));
  const right = Math.max(...frames.map(({ x, outerWidth }) => x + outerWidth / 2));
  const top = Math.max(...frames.map(({ y, outerHeight }) => y + outerHeight / 2));
  const bottom = Math.min(...frames.map(({ y, outerHeight }) => y - outerHeight / 2));
  for (const frame of frames) {
    frame.x -= (left + right) / 2;
    frame.y -= (top + bottom) / 2;
  }
  return { frames, width: right - left, height: top - bottom };
}

export function buildMemoryLayout(zones: MemoryZone[]) {
  let start = FLIGHT_START;
  let side = -1;
  return zones.map((zone) => {
    let cursor = start - ZONE_PADDING;
    const stops = zone.events.flatMap((event) => {
      const media = mediaFor(event);
      if (!media.length) return [];
      const { frames, width, height } = measureFrames(event, media);
      const style = STATION_STYLES[event.layout];
      const titleWidth = Math.max(3.6, width);
      const titleHeight = titleWidth * 0.16;
      const titleY = height / 2 + style.titleGap + titleHeight / 2;
      // Wide stations sit farther out. Aim the panel toward the lane ahead of the ship.
      const x = side * (TRACK_EDGE + 0.45 + titleWidth / 2);
      const viewDistance = 13 + titleWidth * 0.35;
      const yaw = Math.atan2(side * 0.8 - x, viewDistance);
      const span = Math.max(6, Math.abs(Math.sin(yaw)) * (titleWidth + 0.4) + style.clearance * 2);
      const z = cursor - span / 2;
      const placement = {
        event,
        color: zone.color,
        x,
        y: style.elevation,
        z,
        span,
        side,
        yaw,
        frames,
        width: titleWidth,
        height: height + style.titleGap + titleHeight + 0.33,
        frameHeight: height,
        titleY,
        titleHeight,
        arrival: z + 7,
      };
      cursor -= span + style.clearance;
      side *= -1;
      return [placement];
    });
    const end = Math.min(start - zone.length, cursor - ZONE_PADDING);
    const placement = { zone, start, end, stops, arrival: stops[0]?.arrival ?? start - ZONE_PADDING };
    start = end;
    return placement;
  });
}

export const MEMORY_LAYOUT = buildMemoryLayout(MEMORY_ZONES);
export const MEMORY_STATIONS = MEMORY_LAYOUT.flatMap(({ stops }) => stops);
export const FLIGHT_END = MEMORY_LAYOUT.at(-1)?.end ?? FLIGHT_START;
export const LOOP_LENGTH = FLIGHT_START - FLIGHT_END;
export type EventPlacement = (typeof MEMORY_STATIONS)[number];

// Flight and camera keep continuous world coordinates. Only the course lookup wraps.
export function distanceIntoLoop(z: number) {
  const distance = (FLIGHT_START - z) % LOOP_LENGTH;
  return distance < 0 ? distance + LOOP_LENGTH : distance;
}

export function closestLoopZ(z: number, reference: number) {
  return z + Math.round((reference - z) / LOOP_LENGTH) * LOOP_LENGTH;
}

export function zoneAt(z: number) {
  const localZ = FLIGHT_START - distanceIntoLoop(z);
  const index = MEMORY_LAYOUT.findIndex(({ end }) => localZ > end);
  return index < 0 ? MEMORY_LAYOUT.length - 1 : index;
}

export function nearbyStation(z: number) {
  let nearest: EventPlacement | undefined;
  let closestDistance = 13;
  for (const station of MEMORY_STATIONS) {
    const distance = Math.abs(closestLoopZ(station.arrival, z) - z);
    if (distance <= closestDistance) {
      nearest = station;
      closestDistance = distance;
    }
  }
  return nearest;
}
