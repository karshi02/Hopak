import { calcCommission, calcOwnerPayout, calcChamberShare, calcPlatformShare } from './commission';

describe('commission', () => {
  it('calculates 20% commission', () => {
    expect(calcCommission(1000)).toBe(200);
  });

  it('calculates owner payout as 80% of amount', () => {
    expect(calcOwnerPayout(1000)).toBe(800);
  });

  it('splits commission into 10% chamber share and 10% platform share', () => {
    expect(calcChamberShare(1000)).toBe(100);
    expect(calcPlatformShare(1000)).toBe(100);
  });

  it('rounds to 2 decimal places', () => {
    expect(calcCommission(333.33)).toBe(66.67);
    expect(calcChamberShare(333.33)).toBe(33.33);
  });
});
