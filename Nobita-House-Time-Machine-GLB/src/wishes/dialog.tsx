import { type FormEvent, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { cards, demoCode, type WishCard } from './demo';
import type { WishTextRegion } from './frames';

const reactionArt = {
  'wrong-code': { image: 'nobita-sai-ma', title: 'Hình như mã chưa khớp…' },
  unlock: { image: 'doraemon-mo-thiep', title: 'Mở được thiệp rồi!' },
  retry: { image: 'shizuka-goi-y', title: 'Chưa đúng rồi…' },
  solved: { image: 'doraemon-mo-thiep', title: 'Đoán đúng rồi!' },
} as const;

type ReactionKind = keyof typeof reactionArt;
interface Reaction {
  kind: ReactionKind;
  message: string;
  title?: string;
  sequence: number;
}

function WishReaction({ reaction }: { reaction: Reaction | null }) {
  const art = reaction && reactionArt[reaction.kind];
  return (
    <div role="status" aria-atomic="true" className="wish-reaction-status">
      {reaction && art && (
        <div key={reaction.sequence} className="wish-reaction" data-reaction={reaction.kind}>
          <div className="wish-reaction-art" aria-hidden="true">
            <img src={`/wish-reactions/${art.image}.webp`} alt="" />
            {reaction.kind === 'solved' && <span className="wish-reaction-stars">✦</span>}
          </div>
          <div className="wish-reaction-bubble">
            <strong>{reaction.title ?? art.title}</strong>
            <p>{reaction.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function WishTextArea({ area, kind, children }: {
  area: WishTextRegion;
  kind: 'name' | 'message' | 'locked';
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { left, top, width, height, fontSize } = area;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const minimum = kind === 'name' ? 12 : 14;
    let active = true;

    function fit(frame: HTMLDivElement) {
      if (!active || !frame.clientWidth) return;
      let size = Math.max(minimum, fontSize);
      frame.style.setProperty('--wish-copy-size', `${size}px`);
      while (size > minimum && frame.scrollHeight > frame.clientHeight + 1) {
        size -= 1;
        frame.style.setProperty('--wish-copy-size', `${size}px`);
      }
      frame.tabIndex = frame.scrollHeight > frame.clientHeight + 1 ? 0 : -1;
    }

    fit(element);
    const observer = new ResizeObserver(() => fit(element));
    observer.observe(element);
    void document.fonts?.ready.then(() => fit(element));
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [fontSize, kind]);

  return (
    <div
      ref={ref}
      className={`wish-frame-text wish-frame-${kind}`}
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
    >
      <div className="wish-frame-copy">{children}</div>
    </div>
  );
}

const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/đ/g, 'd').trim().replace(/\s+/g, ' ');

function shuffled(names: readonly string[]) {
  return names.map((name) => ({ name, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ name }) => name);
}

export function WishDialog({ card, unlocked, onUnlock, onClose }: {
  card: WishCard;
  unlocked: boolean;
  onUnlock: (recipient: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [input, setInput] = useState('');
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [hintOpen, setHintOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  function reactTo(kind: ReactionKind, message: string, title?: string) {
    setReaction((previous) => ({ kind, message, title, sequence: (previous?.sequence ?? 0) + 1 }));
  }

  function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = input.trim();
    if (!code) {
      reactTo('wrong-code', 'Điền mã để mở lời chúc nhé.', 'Nobita đang chờ mã!');
      return;
    }
    if (code !== demoCode) {
      reactTo('wrong-code', 'Thử nhập lại mã mở thiệp nhé.');
      return;
    }
    setInput('');
    reactTo('unlock', 'Doraemon mời thầy cô đọc lời chúc.');
    onUnlock(card.recipient);
  }

  function guess(name: string) {
    const answer = normalize(name);
    if (!answer) {
      reactTo('retry', 'Có manh mối ở nút bóng đèn đó!', 'Ai gửi lời chúc nhỉ?');
      return;
    }
    if ([card.author, ...card.aliases].some((value) => normalize(value) === answer)) {
      reactTo('solved', 'Chữ ký của người gửi đã hiện trong thiệp.');
      setRevealed(true);
    } else {
      reactTo('retry', 'Thử thêm một tên hoặc xem manh mối ở bóng đèn nhé.');
    }
  }

  function toggleHint() {
    if (!options.length) {
      const others = [...new Set(cards.map(({ author }) => author))].filter((name) => name !== card.author);
      setOptions(shuffled([card.author, ...shuffled(others).slice(0, 3)]));
    }
    setHintOpen((open) => !open);
  }

  const recipient = `Gửi ${card.recipient === 'Cả ba thầy cô' ? 'cả ba thầy cô' : card.recipient}`;
  return (
    <dialog
      ref={dialog}
      className="wish-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <article className="wish-letter">
        <button type="button" className="wish-close" aria-label="Đóng thiệp" onClick={onClose}>×</button>
        {unlocked && <h2 id={titleId} className="wish-recipient">{recipient}</h2>}
        <div className="wish-cover">
          <img src={card.image} alt="" />
          <WishTextArea area={card.messageArea} kind={unlocked ? 'message' : 'locked'}>
            {unlocked ? <p className="wish-message">{card.message}</p> : <h2 id={titleId}>{recipient}</h2>}
          </WishTextArea>
          {revealed && (
            <WishTextArea area={card.nameArea} kind="name">
              <p className="wish-signature" role="status">{card.author}</p>
            </WishTextArea>
          )}
        </div>
        <div className="wish-content">
          <WishReaction reaction={reaction} />
          {!unlocked ? (
            <form noValidate className="wish-form" onSubmit={unlock}>
              <label htmlFor="wish-code">Mã mở thiệp</label>
              <div className="wish-entry">
                <input id="wish-code" type="password" inputMode="numeric" autoComplete="off"
                  autoFocus required value={input} onChange={(event) => setInput(event.target.value)} />
                <button type="submit" className="wish-primary">Mở thiệp</button>
              </div>
              <p className="wish-demo-note">Mã dùng thử {demoCode}</p>
            </form>
          ) : !revealed && (
            <div className={`wish-guess-box${hintOpen ? ' is-open' : ''}`}>
              <form noValidate className="wish-form" onSubmit={(event) => { event.preventDefault(); guess(input); }}>
                <label htmlFor="wish-guess">Lời chúc này đến từ...</label>
                <div className="wish-entry">
                  <input id="wish-guess" placeholder="Tên người bí ẩn..." autoFocus required
                    value={input} onChange={(event) => setInput(event.target.value)} />
                  <button type="submit" className="wish-primary">Thử đoán</button>
                  <button type="button" className="wish-hint-button" aria-label="Gợi ý" title="Gợi ý"
                    aria-expanded={hintOpen} aria-controls="wish-hint" onClick={toggleHint}>
                    <span className="wish-bulb" aria-hidden="true">
                      <span className="wish-bulb-rays" /><span className="wish-bulb-base" />
                    </span>
                  </button>
                </div>
              </form>
              <div id="wish-hint" className="wish-hint" hidden={!hintOpen}>
                {hintOpen && <>
                  <p>{card.hint}</p>
                  <div className="wish-choices">
                    {options.map((name) => (
                      <button key={name} type="button" onClick={() => { setInput(name); guess(name); }}>{name}</button>
                    ))}
                  </div>
                </>}
              </div>
            </div>
          )}
        </div>
      </article>
    </dialog>
  );
}
