import { describe, expect, it } from 'vitest';
import { canOpenWish, validateRecipients } from './data';

const config = {
  ALL: { name: 'Tất cả thầy cô', pinColor: '#ffb33b', passcode: null },
  MON: { name: 'Cô Mon', pinColor: '#ff6fa0', passcode: '0123' },
  DUY_HAI: { name: 'Thầy Duy Hải', pinColor: '#55baff', passcode: '4567' },
  BA_CHIN: { name: 'Thầy Ba Chín', pinColor: '#50cd86', passcode: null },
};

describe('wish board', () => {
  it('accepts distinct codes alongside multiple public recipients', () => {
    expect(() => validateRecipients(config)).not.toThrow();
  });

  it('opens public wishes and checks protected wishes against only their own code', () => {
    expect(canOpenWish(null, '')).toBe(true);
    expect(canOpenWish('0123', '0123')).toBe(true);
    expect(canOpenWish('0123', '4567')).toBe(false);
    expect(canOpenWish('0123', '')).toBe(false);
  });

  it('rejects a shared code', () => {
    expect(() =>
      validateRecipients({
        ...config,
        DUY_HAI: { ...config.DUY_HAI, passcode: '0123' },
      }),
    ).toThrow(/passcode/i);
  });
});
