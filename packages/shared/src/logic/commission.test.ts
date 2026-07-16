import { calcCommission, calcOwnerPayout } from './commission';

describe('commission', () => {
  it('calculates 10% commission', () => {
    expect(calcCommission(1000)).toBe(100);
  });

  it('calculates owner payout as amount minus commission', () => {
    expect(calcOwnerPayout(1000)).toBe(900);
  });

  it('rounds to 2 decimal places', () => {
    expect(calcCommission(333.33)).toBe(33.33);
  });
});
