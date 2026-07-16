import { assertTransition } from './booking-state.machine';

describe('booking state machine', () => {
  it('allows pending -> confirmed', () => {
    expect(() => assertTransition('pending', 'confirmed')).not.toThrow();
  });

  it('allows confirmed -> paid', () => {
    expect(() => assertTransition('confirmed', 'paid')).not.toThrow();
  });

  it('allows paid -> completed', () => {
    expect(() => assertTransition('paid', 'completed')).not.toThrow();
  });

  it('allows pending -> cancelled', () => {
    expect(() => assertTransition('pending', 'cancelled')).not.toThrow();
  });

  it('blocks skipping pending -> paid', () => {
    expect(() => assertTransition('pending', 'paid')).toThrow();
  });

  it('blocks transition out of cancelled', () => {
    expect(() => assertTransition('cancelled', 'confirmed')).toThrow();
  });

  it('blocks transition out of completed', () => {
    expect(() => assertTransition('completed', 'paid')).toThrow();
  });
});
