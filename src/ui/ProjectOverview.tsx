import type { Project, ProjectOverview as Overview } from '../project/project.ts';

function fallback(project: Project): Overview {
  const model = project.baseline.model;
  return {
    context: model.family === 'original' ? 'Custom reward model' : model.name,
    summary: model.blurb,
    distinctive: model.multiPull ? `Each action contains ${model.multiPull.size} reward slots.` : `Each action draws one reward from ${model.items.length} configured items.`,
    strength: model.pity.length ? 'A pull limit guarantees the configured rarity.' : model.spark ? 'Saved exchange points provide another route to an eligible reward.' : 'The configured pool provides a reference for reward availability.',
    analysis: 'Compare reward access, waiting times and resource costs across player horizons.',
  };
}

export function ProjectOverview({ project }: { project: Project }) {
  const overview = project.overview ?? fallback(project);
  return <section className="panel project-overview" aria-labelledby="overview-title">
    <h2 id="overview-title">Game and reward system</h2>
    <div className="overview-intro"><strong>{overview.context}</strong><p>{overview.summary}</p></div>
    <div className="overview-grid">
      <div><h3>How the rewards work</h3><p>{overview.distinctive}</p></div>
      <div><h3>Why players might like it</h3><p>{overview.strength}</p></div>
      {overview.popularity && <div><h3>Popularity and reception</h3><p>{overview.popularity}</p></div>}
      {overview.business && <div><h3>How it makes money</h3><p>{overview.business}</p></div>}
      <div className="overview-questions"><h3>What to explore</h3><p>{overview.analysis}</p></div>
    </div>
    <details className="overview-scope"><summary>Sources and what's included in this example</summary>
      {overview.sources && <ul>{overview.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>}
      <p>{project.baseline.model.source}</p>
      <p>Game-like examples use simplified rules and fictional reward pools. Player appeal and business explanations are design interpretations unless a source supports them. Spending and revenue do not show net profit; that also depends on costs. Descriptions can be edited in the project file without changing the reward rules.</p>
    </details>
  </section>;
}
