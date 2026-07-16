import { maskPhone } from './phone-mask';

describe('maskPhone', () => {
  it('masks a full phone number', () => {
    expect(maskPhone('0891234567')).toBe('089-123-**-*');
  });

  it('masks a hyphenated phone number', () => {
    expect(maskPhone('089-123-4567')).toBe('089-123-**-*');
  });

  it('returns input unchanged when too short', () => {
    expect(maskPhone('12345')).toBe('12345');
  });
});
