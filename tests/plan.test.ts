import { describe, expect, it } from 'vitest';
import { buildPlanUrl, decodePolyline, normalizePlan } from '../server/red/plan';
import { fixtureJson } from './helpers';

describe('decodePolyline', () => {
  it('decodes the reference example from the encoded polyline specification', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]);
  });

  it('returns nothing for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});

describe('buildPlanUrl', () => {
  const params = {
    from: { latitude: -33.4372, longitude: -70.6506 },
    to: { latitude: -33.4489, longitude: -70.6693 },
  };

  it('builds the query the red.cl site sends, using Santiago local time', () => {
    const url = new URL(buildPlanUrl(params, new Date('2026-10-03T15:30:00Z')));
    expect(url.origin).toBe('https://dtpm.amigocloud.com');
    expect(url.pathname).toBe('/api/otp/plan');
    expect(url.searchParams.get('mode')).toBe('WALK,TRANSIT');
    expect(url.searchParams.get('fromPlace')).toBe('-33.4372,-70.6506');
    expect(url.searchParams.get('toPlace')).toBe('-33.4489,-70.6693');
    expect(url.searchParams.get('arriveBy')).toBe('false');
    expect(url.searchParams.get('date')).toBe('10-03-2026');
    expect(url.searchParams.get('time')).toBe('12:30');
  });

  it('switches to bus-only and clamps the number of itineraries', () => {
    const url = new URL(buildPlanUrl({ ...params, busOnly: true, maxItineraries: 99 }, new Date()));
    expect(url.searchParams.get('mode')).toBe('WALK,BUS');
    expect(url.searchParams.get('numItineraries')).toBe('10');
  });

  it('respects an explicit date and time', () => {
    const url = new URL(buildPlanUrl({ ...params, date: '12-24-2026', time: '07:15', arriveBy: true }));
    expect(url.searchParams.get('date')).toBe('12-24-2026');
    expect(url.searchParams.get('time')).toBe('07:15');
    expect(url.searchParams.get('arriveBy')).toBe('true');
  });
});

describe('normalizePlan', () => {
  it('normalizes a real planner response with metro and bus legs', () => {
    const result = normalizePlan(fixtureJson('otp_plan.json'));
    expect(result.reason).toBeNull();
    expect(result.itineraries).toHaveLength(3);
    const [first] = result.itineraries;
    expect(first.durationSeconds).toBe(574);
    expect(first.transfers).toBe(1);
    const metro = first.legs.find((leg) => leg.mode === 'SUBWAY');
    expect(metro).toMatchObject({ route: 'L5', color: '#00965e', textColor: '#ffffff', agency: 'Metro de Santiago' });
    expect(metro?.from).toMatchObject({ name: 'Plaza de Armas L5', stopCode: 'PZ' });
    expect(metro?.path.length).toBeGreaterThan(1);
    expect(metro?.startTime).toBe(new Date(1791041668000).toISOString());
  });

  it('includes bus legs with their headsign', () => {
    const buses = normalizePlan(fixtureJson('otp_plan.json')).itineraries.flatMap((item) =>
      item.legs.filter((leg) => leg.mode === 'BUS'),
    );
    expect(buses.length).toBeGreaterThan(0);
    expect(buses[0].route).toBeTruthy();
    expect(buses[0].headsign).toBeTruthy();
  });

  it('reports the reason when no route exists', () => {
    expect(normalizePlan({ error: { msg: 'Trip is not possible.' } })).toEqual({
      itineraries: [],
      reason: 'Trip is not possible.',
    });
  });

  it('flags a response that does not look like a plan', () => {
    expect(() => normalizePlan({ plan: { itineraries: 'nope' } })).toThrow();
  });
});
