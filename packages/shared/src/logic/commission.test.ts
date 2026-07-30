import { calcCommission, calcOwnerPayout, calcChamberShare, calcPlatformShare } from './commission';

describe('commission', () => {
  it('calculates 20% commission on the total amount', () => {
    expect(calcCommission(1000)).toBe(200);
  });

  it('owner payout = total after commission (80%)', () => {
    expect(calcOwnerPayout(1000)).toBe(800);
  });

  it('chamber share = 10% of commission, platform gets the rest (90% of commission)', () => {
    expect(calcChamberShare(1000)).toBe(20); // 10% ของคอม 200
    expect(calcPlatformShare(1000)).toBe(180); // 200 - 20
  });

  it('rounds to 2 decimal places', () => {
    expect(calcCommission(333.33)).toBe(66.67);
    expect(calcChamberShare(333.33)).toBe(6.67); // 10% ของ 66.67
  });
});
