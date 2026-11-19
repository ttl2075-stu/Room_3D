import { create } from 'zustand';
import { DEFAULT_TIME_OF_DAY, type TimeOfDayId } from '../data/time-of-day';
import { tourStops } from '../data/tour';
import { DEFAULT_WEATHER, type WeatherId } from '../data/weather';

/**
 * Which room the visitor is standing in, or `null` for the street. It replaced a boolean
 * view: the house has more than one room, and "inside" was never one place.
 */
interface AppState {
  selectedCharacterId: string | null;
  activeRoomId: string | null;
  /** Which of the room's places to stand (`HouseRoom.views`) the visitor is at. */
  roomViewIndex: number;
  /** `RoomHotspot.id` whose card is open, or null. Only meaningful inside a room. */
  selectedRoomHotspot: string | null;
  /** Which model URLs actually exist on the server; missing → proxy geometry. */
  availableModels: Record<string, boolean>;
  preflightDone: boolean;
  autoRotate: boolean;
  /** Render stats are a developer tool: off until someone asks for them in the settings. */
  showPerf: boolean;
  /** The six characters stroll round the block; off, they walk back to their spots. */
  walkMode: boolean;
  /** Incremented to request a camera reset; camera rig subscribes. */
  resetToken: number;
  /**
   * Index into `tourStops`, or null when no tour is running. Independent of
   * `activeRoomId`: wandering off the route never cancels the tour — Next re-syncs.
   */
  tourIndex: number | null;
  /** Which lighting/sky preset the scene eases toward. */
  timeOfDay: TimeOfDayId;
  /** Laid over the time of day: rain greys whichever light is selected. */
  weather: WeatherId;
  select: (id: string | null) => void;
  enterRoom: (roomId: string) => void;
  leaveRoom: () => void;
  /** Step to another place to stand in the same room. */
  setRoomView: (index: number) => void;
  selectRoomHotspot: (id: string | null) => void;
  setAvailable: (map: Record<string, boolean>) => void;
  setTimeOfDay: (id: TimeOfDayId) => void;
  setWeather: (id: WeatherId) => void;
  toggleAutoRotate: () => void;
  togglePerf: () => void;
  toggleWalkMode: () => void;
  resetView: () => void;
  startTour: () => void;
  /** +1 next, −1 prev. No-op outside a tour or past either end. */
  tourGo: (dir: 1 | -1) => void;
  exitTour: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedCharacterId: null,
  activeRoomId: null,
  roomViewIndex: 0,
  selectedRoomHotspot: null,
  availableModels: {},
  preflightDone: false,
  autoRotate: false,
  showPerf: false,
  walkMode: false,
  resetToken: 0,
  tourIndex: null,
  timeOfDay: DEFAULT_TIME_OF_DAY,
  weather: DEFAULT_WEATHER,
  select: (id) => set({ selectedCharacterId: id }),
  // Going in closes whatever the street had open: a character card behind a wall is noise.
  // Moving between rooms closes the card too — it describes something now out of sight.
  enterRoom: (roomId) =>
    set({
      activeRoomId: roomId,
      roomViewIndex: 0,
      selectedCharacterId: null,
      selectedRoomHotspot: null,
      autoRotate: false,
    }),
  leaveRoom: () => set({ activeRoomId: null, selectedRoomHotspot: null }),
  // A card describes what the visitor was looking at; from another corner it may be behind them.
  setRoomView: (index) => set({ roomViewIndex: index, selectedRoomHotspot: null }),
  selectRoomHotspot: (id) => set({ selectedRoomHotspot: id }),
  setAvailable: (map) => set({ availableModels: map, preflightDone: true }),
  setTimeOfDay: (id) => set({ timeOfDay: id }),
  setWeather: (id) => set({ weather: id }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  togglePerf: () => set((s) => ({ showPerf: !s.showPerf })),
  toggleWalkMode: () => set((s) => ({ walkMode: !s.walkMode })),
  // Reset always lands on the street: it is the "I am lost" button.
  resetView: () =>
    set((s) => ({
      resetToken: s.resetToken + 1,
      selectedCharacterId: null,
      activeRoomId: null,
      selectedRoomHotspot: null,
      tourIndex: null,
    })),
  // The tour drives the same enter/leave the place menu does; the camera hook
  // cannot tell a tour leg from a menu jump, which is the point.
  startTour: () => {
    set({ tourIndex: 0 });
    const stop = tourStops[0];
    if (stop?.roomId) get().enterRoom(stop.roomId);
    else get().leaveRoom();
  },
  tourGo: (dir) => {
    const { tourIndex } = get();
    if (tourIndex === null) return;
    const next = tourIndex + dir;
    const stop = tourStops[next];
    if (!stop) return;
    set({ tourIndex: next });
    if (stop.roomId) get().enterRoom(stop.roomId);
    else get().leaveRoom();
  },
  exitTour: () => set({ tourIndex: null }),
}));

/** HEAD-check every model once so Suspense never hits a 404 and proxies render instead. */
export async function preflightModels(urls: string[]) {
  const entries = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        const type = res.headers.get('content-type') ?? '';
        // Vite dev serves index.html for unknown paths → treat html as missing.
        return [url, res.ok && !type.includes('text/html')] as const;
      } catch {
        return [url, false] as const;
      }
    }),
  );
  useAppStore.getState().setAvailable(Object.fromEntries(entries));
}
