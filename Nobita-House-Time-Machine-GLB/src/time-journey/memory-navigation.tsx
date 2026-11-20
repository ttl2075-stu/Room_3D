import { FLIGHT_END, FLIGHT_START, MEMORY_LAYOUT, zoneAt } from './memory-layout';

export function MemoryNavigation({
  z,
  view,
  peek,
  reduced,
  onReduced,
  onZone,
  onMove,
  onStop,
  onView,
  onPeek,
  onOpen,
  onLegacy,
  onReturn,
}: {
  z: number;
  view: 'front' | 'chase';
  peek: number;
  reduced: boolean;
  onReduced: (reduced: boolean) => void;
  onZone: (z: number) => void;
  onMove: (distance: number) => void;
  onStop: () => void;
  onView: () => void;
  onPeek: (side: number) => void;
  onOpen: (id: string) => void;
  onLegacy: () => void;
  onReturn: () => void;
}) {
  const index = zoneAt(z);
  const placement = MEMORY_LAYOUT[index];
  if (!placement) return null;
  const { zone, stops } = placement;
  const progress = Math.round((100 * (FLIGHT_START - z)) / (FLIGHT_START - FLIGHT_END));
  return (
    <>
      <section className="memory-status" aria-label="Tiến độ hành trình">
        <h1>Memory Time Gallery</h1>
        <p style={{ color: zone.color }}>
          {index + 1}/{MEMORY_LAYOUT.length} · {zone.title}
        </p>
        <div>
          <progress aria-label="Tiến độ toàn hành trình" max={100} value={progress} />{' '}
          <span>{progress}%</span>
        </div>
      </section>
      <section className="memory-menu" aria-label="Điều hướng triển lãm">
        <select
          aria-label="Bay đến khu"
          value={zone.id}
          onChange={(e) => {
            const next = MEMORY_LAYOUT.find(({ zone }) => zone.id === e.target.value);
            if (next) onZone(next.arrival);
          }}
        >
          {MEMORY_LAYOUT.map(({ zone: item }, i) => (
            <option key={item.id} value={item.id}>
              {i + 1}. {item.title}
            </option>
          ))}
        </select>
        <select aria-label="Mở album trong khu" value="" onChange={(e) => onOpen(e.target.value)}>
          <option value="" disabled>
            Album trong khu
          </option>
          {stops.map(({ event }) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
        <details>
          <summary>Tùy chọn</summary>
          <label>
            <input type="checkbox" checked={reduced} onChange={(e) => onReduced(e.target.checked)} /> Giảm
            chuyển động
          </label>
          <button type="button" onClick={onLegacy}>
            Ảnh đã lưu trước đây
          </button>
          <button type="button" onClick={onReturn}>
            Về phòng Nobita
          </button>
        </details>
      </section>
      <section className="memory-controls" aria-label="Điều khiển cỗ máy">
        <button type="button" onClick={() => onMove(-7)} disabled={z >= FLIGHT_START} title="S · Lùi">
          ← Lùi
        </button>
        <button type="button" onClick={onStop} title="Space · Dừng">
          Dừng
        </button>
        <button type="button" onClick={() => onMove(7)} disabled={z <= FLIGHT_END} title="W · Tiến">
          Tiến →
        </button>
        <button type="button" onClick={onView} title="M · Đổi camera">
          {view === 'chase' ? 'Chính diện' : 'Theo sau'}
        </button>
        <button type="button" aria-label="Nhìn trái" aria-pressed={peek === -1} onClick={() => onPeek(-1)}>
          ◀
        </button>
        <button type="button" aria-label="Nhìn phải" aria-pressed={peek === 1} onClick={() => onPeek(1)}>
          ▶
        </button>
      </section>
    </>
  );
}
