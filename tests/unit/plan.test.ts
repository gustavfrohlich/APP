import { describe, expect, it } from 'vitest';
import {
  allowedFoods,
  DEFAULT_PLAN,
  moveWeek,
  passedFoods,
  planItems,
  shiftAfter,
  weekStatus,
} from '@/domain/plan';
import type { PlanWeek } from '@/domain/types';

const withResults = (results: Record<number, PlanWeek['result']>): PlanWeek[] =>
  DEFAULT_PLAN.map((w) => (results[w.week] ? { ...w, result: results[w.week] } : w));

describe('terv', () => {
  it('9 hét, a 9. a tartalék', () => {
    expect(DEFAULT_PLAN).toHaveLength(9);
    expect(DEFAULT_PLAN[8]!.kind).toBe('reserve');
  });
  it('étel-szövegből chipek', () => {
    expect(planItems('marha + rizs + áfonya')).toEqual(['marha', 'rizs', 'áfonya']);
    expect(planItems('+ édesburgonya, cukkini, körte, csirke')).toEqual([
      'édesburgonya',
      'cukkini',
      'körte',
      'csirke',
    ]);
    expect(planItems('+ tojás (tej nélkül)')).toEqual(['tojás']);
    expect(planItems('hagyma + fokhagyma külön')).toEqual(['hagyma', 'fokhagyma']);
    expect(planItems('tartalék hét')).toEqual([]);
  });
  it('engedélyezett ételek: bázis + ami átment + az aktuális új étel (kumulatív)', () => {
    const plan = withResults({ 1: 'pass', 2: 'pass', 3: 'reaction', 4: 'pass' });
    const names = (w: number) => allowedFoods(plan, w).map((f) => f.name);
    expect(names(3)).toEqual([
      'só',
      'víz',
      'marha',
      'rizs',
      'áfonya',
      'édesburgonya',
      'cukkini',
      'körte',
      'csirke',
      'tej',
    ]);
    expect(names(5)).not.toContain('tej');
    expect(names(5)).toContain('tojás');
    expect(allowedFoods(plan, 5).find((f) => f.name === 'búza')?.isNew).toBe(true);
    expect(passedFoods(plan).map((p) => p.week)).toEqual([1, 2, 4]);
  });
  it('csúsztatás reakció után: visszaállás-hét kerül be, a tartalék elfogy', () => {
    const shifted = shiftAfter(DEFAULT_PLAN, 3);
    expect(shifted).toHaveLength(9);
    expect(shifted[3]).toMatchObject({ week: 4, kind: 'washout' });
    expect(shifted[4]).toMatchObject({ week: 5, food: '+ tojás' });
    expect(shifted[8]).toMatchObject({ week: 9, food: '+ majonézes szószok' });
    // ha nincs több tartalék, a terv hosszabb lesz
    expect(shiftAfter(shifted, 5)).toHaveLength(10);
  });
  it('csak jövőbeli hetek mozgathatók', () => {
    const moved = moveWeek(DEFAULT_PLAN, 5, 7, 3);
    expect(moved.map((w) => w.food).slice(4, 7)).toEqual(['+ fűszerek', '+ cukor', '+ búza']);
    expect(moveWeek(DEFAULT_PLAN, 2, 7, 3)).toEqual(DEFAULT_PLAN);
    // a kezdés előtt is: a bázishetek nem mozdulnak, és nem lehet közéjük tenni
    expect(moveWeek(DEFAULT_PLAN, 5, 2, 0)).toEqual(DEFAULT_PLAN);
    expect(
      moveWeek(DEFAULT_PLAN, 5, 3, 0)
        .map((w) => w.food)
        .slice(2, 5),
    ).toEqual(['+ búza', '+ tej', '+ tojás']);
  });
  it('hét állapota', () => {
    expect(weekStatus({ ...DEFAULT_PLAN[0]!, result: 'pass' }, 3)).toBe('closed');
    expect(weekStatus(DEFAULT_PLAN[2]!, 3)).toBe('current');
    expect(weekStatus(DEFAULT_PLAN[5]!, 3)).toBe('future');
    expect(weekStatus(DEFAULT_PLAN[1]!, 3)).toBe('open');
  });
});
