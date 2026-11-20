import { distanceIntoLoop, LOOP_LENGTH, MEMORY_LAYOUT, nearbyStation, zoneAt } from './memory-layout';

export function MemoryNavigation({
  z,
  view,
  peek,
  reduced,
  autoFly,
  onAutoFly,
  onReduced,
  onZone,
  onMove,
  onStop,
  onView,
  onPeek,
  onInspect,
  onLegacy,
  onReturn,
}: {
  z: number;
  view: 'front' | 'chase';
  peek: number;
  reduced: boolean;
  autoFly: boolean;
  onAutoFly: () => void;
  onReduced: (reduced: boolean) => void;
  onZone: (z: number) => void;
  onMove: (distance: number) => void;
  onStop: () => void;
  onView: () => void;
  onPeek: (side: number) => void;
  onInspect: (id: string) => void;
  onLegacy: () => void;
  onReturn: () => void;
}) {
  const index = zoneAt(z);
  const placement = MEMORY_LAYOUT[index];
  if (!placement) return null;
  const { zone } = placement;
  const nearby = nearbyStation(z);
  const progress = Math.floor((100 * distanceIntoLoop(z)) / LOOP_LENGTH);
  return (
    <>
      <section className="memory-status" aria-label="Tiến độ hành trình">
        <h1>Memory Time Gallery</h1>
        <p style={{ color: zone.color }}>
          {index + 1}/{MEMORY_LAYOUT.length} · {zone.title}
        </p>
        <div>
          <progress aria-label="Tiến độ vòng hiện tại" max={100} value={progress} /> <span>{progress}%</span>
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
        <select
          aria-label="Chọn trạm hoặc album trong khu"
          value=""
          onChange={(e) => onInspect(e.target.value)}
        >
          <option value="" disabled>
            Trạm và album
          </option>
          {zone.events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="memory-auto"
          aria-pressed={autoFly}
          onKeyDown={(event) => {
            if (event.code === 'Space') event.stopPropagation();
          }}
          onClick={onAutoFly}
        >
          Bay tự động <span aria-hidden="true">{autoFly ? '· Bật' : '· Tắt'}</span>
        </button>
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
      {nearby && (
        <button
          type="button"
          className="memory-nearby"
          title="E · Quan sát trạm"
          onClick={() => onInspect(nearby.event.id)}
        >
          <span aria-hidden="true">↗</span> {nearby.event.title}
        </button>
      )}
      <section className="memory-controls" aria-label="Điều khiển cỗ máy">
        <button type="button" onClick={() => onMove(-7)} title="S · Lùi">
          ← Lùi
        </button>
        <button type="button" onClick={onStop} title="Space · Dừng">
          Dừng
        </button>
        <button type="button" onClick={() => onMove(7)} title="W · Tiến">
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
