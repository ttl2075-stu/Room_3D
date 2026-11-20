import { frames, type TextAreaSize, type WishTextRegion } from './frames';
import wishData from './loichuc.json';

export type RecipientId = keyof typeof wishData.recipients;

interface Recipient {
  name: string;
  pinColor: string;
  passcode: string | null;
}

export const recipients: Record<RecipientId, Recipient> = wishData.recipients;

export function validateRecipients(config: Readonly<Record<RecipientId, Recipient>>) {
  const codes = new Set<string>();
  for (const [id, { passcode }] of Object.entries(config)) {
    if (passcode === null) continue;
    if (typeof passcode !== 'string' || !passcode || passcode !== passcode.trim()) {
      throw new Error(`Passcode của ${id} phải là chuỗi không trống hoặc null.`);
    }
    if (codes.has(passcode)) throw new Error(`Passcode của ${id} bị trùng.`);
    codes.add(passcode);
  }
}

export function canOpenWish(passcode: string | null, input: string): boolean {
  return passcode === null || passcode === input.trim();
}

export interface WishCard {
  id: number;
  recipient: RecipientId;
  image: string;
  messageArea: WishTextRegion;
  nameArea: WishTextRegion;
  author: string;
  message: string;
}

const textArea = ([left, top, width, height, fontSize]: TextAreaSize): WishTextRegion => ({
  left,
  top,
  width,
  height,
  fontSize,
});

validateRecipients(recipients);

export const cards: readonly WishCard[] = wishData.wishes.map(({ sender, recipient, message }, index) => {
  const frame = frames[index];
  if (!frame) throw new Error(`Bảng lời chúc có tối đa ${frames.length} thiệp.`);
  if (!Object.hasOwn(recipients, recipient)) {
    throw new Error(`Thiệp ${index + 1} có người nhận không hợp lệ: ${recipient}.`);
  }
  const [image, messageArea, nameArea] = frame;
  return {
    id: index + 1,
    recipient: recipient as RecipientId,
    image: `/wish-cards/${image}`,
    messageArea: textArea(messageArea),
    nameArea: textArea(nameArea),
    author: sender,
    message,
  };
});
