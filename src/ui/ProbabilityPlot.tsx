import type { ReactNode } from 'react';

/** HTML axes keep labels readable when a probability plot is resized. */
export function ProbabilityPlot({ max, children }: { max: number; children: ReactNode }) {
  return <div className="probability-plot">
    <div className="plot-y" data-ui-number>{[100, 75, 50, 25, 0].map(value => <span key={value}>{value}%</span>)}</div>
    <div className="plot-area">{children}</div>
    <div className="plot-x" data-ui-number>{[0, .25, .5, .75, 1].map(fraction => <span key={fraction}>{Math.round(max * fraction).toLocaleString()}</span>)}</div>
  </div>;
}
