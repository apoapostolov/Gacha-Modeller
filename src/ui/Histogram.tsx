import type { Histogram as HistogramData } from '../engine/types.ts';

export function Histogram({ data, unit }: { data: HistogramData; unit: string }) {
  const max = Math.max(1, ...data.counts);
  const end = data.start + data.width * data.counts.length;
  const unitSingular = unit.endsWith('s') ? unit.slice(0, -1) : unit;
  return (
    <figure className="histo">
      <div className="histo-bars" role="img" aria-label={`Number of trials in each ${unitSingular} count range`}>
        {data.counts.map((count, i) => (
          <div
            key={i}
            className="histo-bar"
            style={{ height: `${(count / max) * 100}%` }}
            title={`${Math.round(data.start + i * data.width)}–${Math.round(data.start + (i + 1) * data.width)} ${unit}: ${count} trials`}
          />
        ))}
      </div>
      <figcaption>
        <span>{Math.round(data.start)}</span>
        <span>{unit}</span>
        <span>{Math.round(end)}</span>
      </figcaption>
    </figure>
  );
}
