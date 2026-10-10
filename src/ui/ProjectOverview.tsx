import type { Project, ProjectOverview as Overview } from '../project/project.ts';
import { Help } from './Help.tsx';

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

function Explanation({ label, text }: { label: string; text: string }) {
  const sentence = text.split(/(?<=[.!?])\s/)[0]!;
  const visible = sentence.length <= 200 ? sentence : `${sentence.slice(0, 180).replace(/\s+\S*$/, '')}…`;
  return <p>{visible}{visible !== text && <> <Help label={label}>{text}</Help></>}</p>;
}

export function ProjectOverview({ project }: { project: Project }) {
  const overview = project.overview ?? fallback(project);
  return <section className="panel project-overview" aria-labelledby="overview-title">
    <h2 id="overview-title">Model overview</h2>
    <div className="overview-intro"><strong>{overview.context}.</strong> <Explanation label="Model context" text={overview.summary} /></div>
    <div className="overview-grid">
      <div><h3>Distinctive mechanics</h3><Explanation label="Distinctive mechanics" text={overview.distinctive} /></div>
      <div><h3>Reward support</h3><Explanation label="Reward support" text={overview.strength} /></div>
      <div><h3>Analysis focus</h3><Explanation label="Analysis focus" text={overview.analysis} /></div>
    </div>
    <p className="overview-scope">Describes this configured example. <Help label="Overview evidence"><p>Reward support describes a model feature, not a measured improvement in engagement or profit. Game examples use dated rule shapes and synthetic pools.</p><p>{project.baseline.model.source}</p><p>Project descriptions are editable in the project JSON under overview. Descriptions do not alter model probabilities or snapshot hashes.</p></Help></p>
  </section>;
}
