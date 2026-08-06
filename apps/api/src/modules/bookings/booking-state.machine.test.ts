import { assertTransition } from './booking-state.machine';

describe('booking state machine', () => {
  it('allows pending -> paid (จ่าย QR ตรง ไม่มีด่านเจ้าของหอ)', () => {
    expect(() => assertTransition('pending', 'paid')).not.toThrow();
  });

  it('allows paid -> completed', () => {
    expect(() => assertTransition('paid', 'completed')).not.toThrow();
  });

  it('allows pending -> cancelled', () => {
    expect(() => assertTransition('pending', 'cancelled')).not.toThrow();
  });

  it('blocks skipping paid -> pending', () => {
    expect(() => assertTransition('paid', 'pending')).toThrow();
  });

  it('blocks transition out of cancelled', () => {
    expect(() => assertTransition('cancelled', 'paid')).toThrow();
  });

  it('blocks transition out of completed', () => {
    expect(() => assertTransition('completed', 'paid')).toThrow();
  });
});
