import { describe, it, expect } from 'vitest';
import { intervalsOverlap } from './availability';

describe('intervalsOverlap', () => {
  it('returns true on inclusive overlap edges', () => {
    expect(intervalsOverlap('2025-09-10','2025-09-12','2025-09-12','2025-09-15')).toBe(true);
    expect(intervalsOverlap('2025-09-10','2025-09-12','2025-09-08','2025-09-10')).toBe(true);
  });
  it('returns false when disjoint', () => {
    expect(intervalsOverlap('2025-09-10','2025-09-12','2025-09-13','2025-09-15')).toBe(false);
    expect(intervalsOverlap('2025-09-10','2025-09-12','2025-09-01','2025-09-09')).toBe(false);
  });
});
