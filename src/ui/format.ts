import type { Goal, Summary } from '../engine/types.ts';

export function fmt(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: n >= 100 && digits === 1 ? 0 : undefined,
  });
}

export function money(n: number, currency: string): string {
  return `${fmt(n, n >= 100 ? 0 : 1)} ${currency}`;
}

export function goalLabel(goal: Goal): string {
  switch (goal.type) {
    case 'first-featured':
      return 'First featured';
    case 'copies':
      return `${goal.count} featured copies`;
    case 'unique-featured':
      return `${goal.count} unique pickups`;
    case 'budget':
      return `${goal.pulls} pulls`;
    case 'collection':
      return 'Complete the set';
  }
}

export function shortSummary(s: Summary): string {
  return `mean ${fmt(s.mean)} · median ${fmt(s.median)} · p90 ${fmt(s.p90)}`;
}
