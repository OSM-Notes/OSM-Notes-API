import {
  buildActivityByYearFromRow,
  buildTrendsFromDatamartRow,
} from '../../../src/utils/activityByYear';

describe('activityByYear utils', () => {
  it('builds map from history_YYYY_open and history_YYYY_closed', () => {
    const row = {
      history_2020_open: 3,
      history_2020_closed: 2,
      history_2021_open: 5,
      history_2021_closed: 4,
    };
    const out = buildActivityByYearFromRow(row);
    expect(out).toEqual({
      '2020': { open: 3, closed: 2 },
      '2021': { open: 5, closed: 4 },
    });
  });

  it('uses legacy activity_by_year JSON when no per-year columns', () => {
    const row = {
      activity_by_year: { '2019': { open: 1, closed: 1 } },
    };
    const out = buildActivityByYearFromRow(row);
    expect(out).toEqual({ '2019': { open: 1, closed: 1 } });
  });

  it('buildTrendsFromDatamartRow uses history_year_* when no per-year data', () => {
    const row = { history_year_open: 7, history_year_closed: 3 };
    const t = buildTrendsFromDatamartRow(row, 'global');
    expect(t).toHaveLength(1);
    expect(t[0].open).toBe(7);
    expect(t[0].closed).toBe(3);
    expect(t[0].year).toBe(String(new Date().getUTCFullYear()));
  });
});
