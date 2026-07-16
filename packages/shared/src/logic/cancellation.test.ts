import { canCancel, getCancelDeadline } from './cancellation';

describe('cancellation', () => {
  it('allows cancel within 24 hours', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-01-01T23:59:00Z');
    expect(canCancel(createdAt, now)).toBe(true);
  });

  it('blocks cancel after 24 hours', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-01-02T00:00:01Z');
    expect(canCancel(createdAt, now)).toBe(false);
  });

  it('deadline is exactly 24 hours after creation', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    expect(getCancelDeadline(createdAt).toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });
});
