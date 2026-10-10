import type { Goal, Summary } from '../engine/types.ts';

export function fmt(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: n >= 100 && digits === 1 ? 0 : undefined,
  });
}

export function money(n: number, currency: string): string {
  const units: Record<string, string> = {
    'primogem-like': 'modelled primogems',
    'saint-quartz-like': 'modelled Saint Quartz',
    'pyroxene-like': 'modelled pyroxene',
    'usd-like': 'modelled USD',
    ticket: Math.abs(n) === 1 ? 'ticket' : 'tickets',
    pack: Math.abs(n) === 1 ? 'pack' : 'packs',
  };
  return `${fmt(n, n >= 100 ? 0 : 1)} ${units[currency] ?? currency}`;
}

export function goalLabel(goal: Goal): string {
  switch (goal.type) {
    case 'targets': return `selected targets (${goal.targets.length})`;
    case 'first-featured':
      return 'first featured item';
    case 'copies':
      return `${goal.count} featured ${goal.count === 1 ? 'copy' : 'copies'}`;
    case 'unique-featured':
      return `${goal.count} different featured items`;
    case 'budget':
      return `${goal.pulls}-pull budget`;
    case 'collection':
      return 'full collection';
  }
}

export function shortSummary(s: Summary): string {
  return `Average ${fmt(s.mean)} · median ${fmt(s.median)} · 90th percentile ${fmt(s.p90)}`;
}
