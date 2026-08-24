import type { Histogram as HistogramData } from '../engine/types.ts';

export function Histogram({ data, unit }: { data: HistogramData; unit: string }) {
  const max = Math.max(1, ...data.counts);
  const end = data.start + data.width * data.counts.length;
  return (
    <figure className="histo">
      <div className="histo-bars" role="img" aria-label={`How often each ${unit} count showed up`}>
        {data.counts.map((count, i) => (
          <div
            key={i}
            className="histo-bar"
            style={{ height: `${(count / max) * 100}%` }}
            title={`${Math.round(data.start + i * data.width)}–${Math.round(data.start + (i + 1) * data.width)} ${unit}: ${count}`}
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
