import { useEffect, useRef, useState } from 'react';
import { addPhotos, listPhotos, removePhoto, type StoredPhoto, updatePhoto } from './gallery-storage';
import { LEGACY_ALBUMS, MEMORY_EVENTS, MEMORY_ZONES, type MemoryMedia } from './memory-data';

type LocalMedia = { kind: 'image'; src: string; preview: string; row: StoredPhoto };
type AlbumMedia = MemoryMedia | LocalMedia;

function MediaImage({ src, alt, thumb }: { src: string; alt: string; thumb?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="memory-media-empty">Ảnh không tải được</span>
  ) : (
    <img
      src={src}
      alt={alt}
      loading={thumb ? 'lazy' : 'eager'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function LocalPhotoEditor({
  row,
  legacy,
  onUpdate,
  onError,
}: {
  row: StoredPhoto;
  legacy: boolean;
  onUpdate: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [description, setDescription] = useState(row.description);
  const [destination, setDestination] = useState('');
  const [busy, setBusy] = useState(false);
  async function mutate(action: 'save' | 'move' | 'delete') {
    if (action === 'delete' && !window.confirm('Xóa ảnh này khỏi thư viện trên thiết bị?')) return;
    setBusy(true);
    try {
      if (action === 'delete') await removePhoto(row.id);
      else
        await updatePhoto(row.id, {
          title,
          description,
          ...(action === 'move' ? { eventId: destination } : {}),
        });
      onUpdate(
        action === 'move'
          ? 'Đã gán ảnh vào hoạt động.'
          : action === 'save'
            ? 'Đã lưu nội dung.'
            : 'Đã xóa ảnh.',
      );
    } catch {
      onError('Không cập nhật được ảnh trên thiết bị.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="memory-local-editor">
      {legacy && <p>{LEGACY_ALBUMS[row.album ?? -1] ?? 'Ảnh từ thư viện trước đây'}</p>}
      <label>
        Tiêu đề
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Mô tả
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="journey-gallery-tools">
        <button type="button" className="journey-button" disabled={busy} onClick={() => void mutate('save')}>
          Lưu nội dung
        </button>
        <button
          type="button"
          className="journey-button journey-danger"
          disabled={busy}
          onClick={() => void mutate('delete')}
        >
          Xóa ảnh
        </button>
      </div>
      {legacy && (
        <div className="journey-gallery-tools">
          <select
            aria-label="Chọn hoạt động để gán ảnh"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="">Chọn hoạt động</option>
            {MEMORY_ZONES.map((zone) => (
              <optgroup key={zone.id} label={zone.title}>
                {zone.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            className="journey-button"
            disabled={!destination || busy}
            onClick={() => void mutate('move')}
          >
            Gán ảnh
          </button>
        </div>
      )}
    </div>
  );
}

export function Gallery({
  eventId,
  selectedSrc,
  onClose,
}: {
  eventId: string;
  selectedSrc?: string;
  onClose: () => void;
}) {
  const event = MEMORY_EVENTS.find((item) => item.id === eventId);
  const legacy = eventId === 'legacy';
  const [photos, setPhotos] = useState<LocalMedia[]>([]);
  const [selected, setSelected] = useState(selectedSrc);
  const [serial, setSerial] = useState(0);
  const [notice, setNotice] = useState('');
  const [videoFailed, setVideoFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const swipe = useRef<number | null>(null);
  const publicMedia = event ? [...event.images, ...event.videos] : [];
  const items: AlbumMedia[] = [...publicMedia, ...photos];
  const index = items.findIndex((media) => media.src === selected);
  const detail = items[index];
  const title = event?.title ?? 'Ảnh đã lưu trước đây';

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reload the committed IndexedDB rows after each mutation.
  useEffect(() => {
    setPhotos([]);
    let cancelled = false;
    const urls: string[] = [];
    listPhotos(eventId)
      .then((rows) => {
        if (cancelled) return;
        setPhotos(
          rows.map((row) => {
            const src = URL.createObjectURL(row.blob);
            urls.push(src);
            return { kind: 'image', src, preview: src, row };
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setNotice('Trình duyệt không mở được kho ảnh cục bộ.');
      });
    return () => {
      cancelled = true;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [eventId, serial]);

  function move(direction: number) {
    const next = items[index + direction];
    if (next) choose(next.src);
  }

  function choose(src: string | undefined) {
    setVideoFailed(false);
    setSelected(src);
  }

  async function upload(files: FileList | null) {
    if (!files?.length || legacy) return;
    const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!images.length) {
      setNotice('Hãy chọn tệp ảnh.');
      return;
    }
    setUploading(true);
    try {
      await addPhotos(
        images.map((blob) => ({ eventId, blob, title: blob.name.replace(/\.[^.]+$/, ''), description: '' })),
      );
      setSerial((n) => n + 1);
      setNotice('Đã lưu ảnh trên trình duyệt này.');
    } catch {
      setNotice('Không lưu được ảnh trên thiết bị.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function cards(media: AlbumMedia[]) {
    return (
      <div className="journey-photos">
        {media.map((item) => {
          const caption = 'row' in item ? item.row.title : item.kind === 'video' ? 'Video' : title;
          return (
            <button
              key={item.src}
              type="button"
              className="journey-polaroid"
              onClick={() => choose(item.src)}
            >
              <MediaImage src={item.preview} alt={caption} thumb />
              <strong>{caption}</strong>
              {item.kind === 'video' && <small>▶ Xem video</small>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <dialog
      ref={dialog}
      className="journey-gallery panel"
      aria-labelledby="memory-album-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (!detail || (e.target instanceof HTMLElement && e.target.closest('input,textarea,select,video')))
          return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          move(e.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      <header className="journey-gallery-head">
        <div>
          <p className="journey-eyebrow">{legacy ? 'Kho ảnh cục bộ' : 'Album triển lãm'}</p>
          <h2 id="memory-album-title">{title}</h2>
          {event?.date && <p>{event.date}</p>}
          {event?.description && <p>{event.description}</p>}
        </div>
        <button type="button" className="journey-icon-button" onClick={onClose} aria-label="Đóng album">
          ✕
        </button>
      </header>
      {detail ? (
        <>
          <div
            className="memory-detail-media"
            onTouchStart={(e) => {
              if (detail.kind === 'image') swipe.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchCancel={() => {
              swipe.current = null;
            }}
            onTouchEnd={(e) => {
              const start = swipe.current;
              const end = e.changedTouches[0]?.clientX;
              swipe.current = null;
              if (start !== null && end !== undefined && Math.abs(end - start) > 45)
                move(end < start ? 1 : -1);
            }}
          >
            {detail.kind === 'video' ? (
              videoFailed ? (
                <span className="memory-media-empty">Video không tải được</span>
              ) : (
                // Supplied videos have no caption tracks.
                // biome-ignore lint/a11y/useMediaCaption: Caption files were not supplied.
                <video
                  key={detail.src}
                  src={detail.src}
                  poster={detail.preview}
                  controls
                  playsInline
                  preload="metadata"
                  onError={() => setVideoFailed(true)}
                />
              )
            ) : (
              <MediaImage
                key={detail.src}
                src={detail.src}
                alt={'row' in detail ? detail.row.title : title}
              />
            )}
          </div>
          <div className="journey-gallery-tools memory-detail-actions">
            <button type="button" className="journey-button" onClick={() => choose(undefined)}>
              Về album
            </button>
            <button type="button" className="journey-button" disabled={index <= 0} onClick={() => move(-1)}>
              ← Trước
            </button>
            <span>
              {index + 1} / {items.length}
            </span>
            <button
              type="button"
              className="journey-button"
              disabled={index >= items.length - 1}
              onClick={() => move(1)}
            >
              Sau →
            </button>
          </div>
          {'row' in detail && (
            <LocalPhotoEditor
              key={detail.row.id}
              row={detail.row}
              legacy={legacy}
              onError={setNotice}
              onUpdate={(message) => {
                choose(undefined);
                setSerial((n) => n + 1);
                setNotice(message);
              }}
            />
          )}
        </>
      ) : (
        <>
          {!legacy && (
            <section>
              <h3>Ảnh và video công khai</h3>
              {publicMedia.length > 0 ? (
                cards(publicMedia)
              ) : (
                <div className="memory-media-empty">
                  <strong>{title}</strong>
                  <span>Chưa có ảnh triển lãm</span>
                </div>
              )}
            </section>
          )}
          <section>
            <h3>{legacy ? 'Ảnh từ thư viện trước đây' : 'Ảnh trên thiết bị này'}</h3>
            <p>
              {legacy
                ? 'Chọn ảnh để gán vào một hoạt động.'
                : 'Ảnh thêm tại đây được lưu trên trình duyệt này.'}
            </p>
            {!legacy && (
              <div className="journey-gallery-tools">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => void upload(e.target.files)}
                />
                <button
                  type="button"
                  className="journey-button journey-button-primary"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  ＋ Thêm ảnh kỷ niệm
                </button>
              </div>
            )}
            {photos.length > 0 ? cards(photos) : legacy && <p>Kho ảnh cũ đang trống.</p>}
          </section>
        </>
      )}
      {notice && (
        <p className="journey-notice" role="status">
          {notice}
        </p>
      )}
    </dialog>
  );
}
