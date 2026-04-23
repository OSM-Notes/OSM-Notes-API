import {
  compareSemver,
  isDwhVersionInRange,
  isSafeSchemaComponentId,
} from '../../../src/utils/dwhSchemaContract';

describe('dwhSchemaContract', () => {
  it('compareSemver orders versions', () => {
    expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
    expect(compareSemver('1.0.1', '1.0.0')).toBe(1);
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
  });

  it('isDwhVersionInRange matches Analytics defaults (1.0.0 .. 1.0.x)', () => {
    expect(isDwhVersionInRange('1.0.0', '1.0.0', '1.0.x')).toBe(true);
    expect(isDwhVersionInRange('1.0.9', '1.0.0', '1.0.x')).toBe(true);
    expect(isDwhVersionInRange('1.1.0', '1.0.0', '1.0.x')).toBe(false);
  });

  it('isSafeSchemaComponentId rejects unsafe values', () => {
    expect(isSafeSchemaComponentId('dwh')).toBe(true);
    expect(isSafeSchemaComponentId("dwh';")).toBe(false);
  });
});
