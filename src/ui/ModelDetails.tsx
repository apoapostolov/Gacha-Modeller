import { createState, mulberry32, pull, pullPack, validateBanner, type Banner, type PullOutcome } from '../engine/index.ts';
import { useMemo } from 'react';
import { Help } from './Help.tsx';

export function ModelDetails({ model, role, hash, seed, actionMode, targetId, onEdit }: { model: Banner; role: 'Baseline' | 'Candidate'; hash: string; seed: number; actionMode: 'single' | 'pack'; targetId?: string; onEdit?: () => void }) {
  const shortDescription = model.blurb.length <= 160 && !model.blurb.includes('\n');
  const firstSentence = model.blurb.split(/(?<=[.!?])\s/)[0]!.replaceAll('\n', ' ');
  const overview = firstSentence.length <= 160 ? firstSentence : 'Reward catalogue, acquisition probabilities and progress rules.';
  const validation = useMemo(() => validateBanner(model), [model]);
  const sample = useMemo(() => {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) return [];
    const rng = mulberry32(seed); const state = createState(model, targetId);
    if (actionMode === 'pack' && model.multiPull) return pullPack(model, state, rng);
    const outcomes: PullOutcome[] = [];
    for (let i = 0; i < 10; i++) outcomes.push(pull(model, state, rng));
    return outcomes;
  }, [model, seed, actionMode, targetId]);
  return <section className="panel model-details">
    <div className="section-heading"><span className={`role-label ${role.toLowerCase()}`}>{role}</span>{onEdit ? <button className="text-button" onClick={onEdit}>Edit candidate</button> : <span className="run-note">Locked <Help label="Immutable baseline">The imported baseline is an immutable snapshot. Editing creates a new candidate revision; previous snapshots remain available in history.</Help></span>}</div>
    <h3>{model.name}</h3>
    <p className="model-description">{shortDescription ? model.blurb : overview} {!shortDescription && <Help label={`${role} overview`}>{model.blurb}</Help>}</p>
    <p className="run-note">{model.items.length} items · {model.rarities.length} {model.rarities.length === 1 ? 'tier' : 'tiers'}</p>
    <div className="rates">
      {model.rarities.slice(0, -1).map((rarity) => <div className="rate" key={rarity.id}><b>{(rarity.baseRate * 100).toFixed(rarity.baseRate < .02 ? 2 : 1)}%</b><span>{rarity.name}</span></div>)}
      {model.pity[0] && <div className="rate"><b>{model.pity[0].hardAt}</b><span>Hard pity</span></div>}
      {model.featured && <div className="rate"><b>{(model.featured.chance * 100).toFixed(1)}%</b><span>Featured per chase hit</span></div>}
      {model.spark && <div className="rate"><b>{model.spark.cost}</b><span>Exchange cost</span></div>}
      {model.charge && <div className="rate"><b>{model.charge.midAt}/{model.charge.hardAt}</b><span>Charge checkpoints</span></div>}
    </div>
    <div className="model-hints"><span>Source assumptions and model rules are available in the detail panel. <Help label={`${role} source and rules`}><p>{model.source}</p><ul>{model.notes.map((note, index) => <li key={index}>{note}</li>)}</ul></Help></span><span>Earlier rarity tiers get the first share of each draw. <Help label={`${role} rarity priority`}>Rarities are evaluated in their listed order. The final tier gets the remaining probability. Higher tiers consume soft-pity probability before lower tiers.</Help></span>
      {validation.warnings.length > 0 && <span className="warning-text">Soft pity can leave less probability for later tiers. <Help label={`${role} rate overlap`}>{validation.warnings.map((issue) => <p key={`${issue.path}-${issue.code}`}>{issue.message}</p>)}</Help></span>}
      {model.multiPull && <span>Buy {model.multiPull.size} pulls together; every slot is paid for. <Help label={`${role} pack guarantee`}>{model.multiPull.guaranteeRarity ? `At least one ${model.rarities.find((r) => r.id === model.multiPull!.guaranteeRarity)?.name} or higher. ` : 'No minimum tier. '}The whole pack is purchased even after early attainment.</Help></span>}
      {model.spark && <span>Trade saved exchange points for an eligible reward. <Help label={`${role} exchange effects`}>Reward choice: {model.spark.choice ?? 'missing-first'}. Eligible rewards: {model.spark.items?.join(', ') ?? 'positive-weight featured items'}. Draw counters and capture/charge protection are preserved unless this model declares reset effects. Resets: {JSON.stringify(model.spark.reset ?? 'none')}.</Help></span>}
    </div>
    <details className="sample-details"><summary>Sample pulls <Help label={`${role} sample pulls`}>A fresh-state illustration using seed {seed}. It is separate from the compared trial population. Comparison jobs use named per-event streams; this illustration uses the legacy sequential stream.</Help></summary><p className="field-hint">These pulls illustrate a fresh player using seed {seed}.</p><div className="tape" aria-label={`${role} sample pulls`}>{sample.map((row, i) => <span key={i} className={row.item.featured ? 'chip featured' : 'chip'}>{i + 1} {row.item.name}{row.packGuaranteed ? ' · pack guarantee' : row.pityKind !== 'none' ? ` · ${row.pityKind} pity` : ''}</span>)}</div></details>
    <p className="snapshot-id">Snapshot {hash.slice(0, 12)} <Help label={`${role} snapshot hash`}>SHA-256 of the canonical complete model. Object keys are sorted; array order is preserved because selection and pity precedence can depend on it. {hash}</Help></p>
  </section>;
}
