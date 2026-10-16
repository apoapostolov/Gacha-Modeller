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
  return <section className="panel model-details" data-ui-container>
    <div className="section-heading"><span className={`role-label ${role.toLowerCase()}`}>{role === 'Baseline' ? 'Current rules' : 'Proposed rules'}</span>{onEdit ? <button className="text-button" onClick={onEdit}>Edit proposal</button> : <span className="run-note">Current saved rules. <Help label="Baseline model">The baseline is the fixed reference for this study. Editing creates a candidate revision; previous snapshots remain available in history.</Help></span>}</div>
    <h3>{model.name}</h3>
    <p className="model-description">{shortDescription ? model.blurb : overview} {!shortDescription && <Help label={`${role} overview`}>{model.blurb}</Help>}</p>
    <p className="run-note">{model.items.length} possible rewards across {model.rarities.length} {model.rarities.length === 1 ? 'rarity level' : 'rarity levels'}. A listed chance is the chance before progress guarantees change it.</p>
    <div className="rates">
      {model.rarities.slice(0, -1).map((rarity) => <div className="rate" data-ui-number key={rarity.id}><b>{(rarity.baseRate * 100).toFixed(rarity.baseRate < .02 ? 2 : 1)}%</b><span>Base chance of {rarity.name}</span></div>)}
      {model.pity[0] && <div className="rate" data-ui-number><b>{model.pity[0].hardAt}</b><span>Rarity guaranteed by draw</span></div>}
      {model.featured && <div className="rate" data-ui-number><b>{(model.featured.chance * 100).toFixed(1)}%</b><span>Chance the {model.rarities.find(rarity => rarity.id === model.featured!.rarity)?.name} is featured</span></div>}
      {model.spark && <div className="rate" data-ui-number><b>{model.spark.cost}</b><span>Points for a guaranteed reward</span></div>}
      {model.charge && <div className="rate" data-ui-number><b>{model.charge.midAt}/{model.charge.hardAt}</b><span>Charge checkpoints</span></div>}
    </div>
    <p className="field-hint">{model.multiPull?.slots ? 'Pack rules can give different reward chances to different slots.' : model.pity.length || model.charge ? 'A player’s progress can raise or guarantee a reward chance.' : 'These chances apply to each draw before any progress guarantees.'} <Help label={`${role} probability rules`}>A chance is the share of possible outcomes expected over many draws. For example, 2% means about 2 in 100 draws before any guarantees. Fixed pack slots may follow separate rules. Pity and charge can change chances as a player makes more draws.</Help></p>
    {model.multiPull && <p className="field-hint">{model.multiPull.size} reward slots per pack{model.multiPull.guaranteeRarity ? ` · ${model.rarities.find(r => r.id === model.multiPull!.guaranteeRarity)?.name} or better guaranteed` : ''}.</p>}
    <details className="model-rule-details"><summary>Rules and sources</summary><div className="model-hints"><span>Rule assumptions define the scope of this example. <Help label={`${role} source and rules`}><p>{model.source}</p><ul>{model.notes.map((note, index) => <li key={index}>{note}</li>)}</ul></Help></span>
      {validation.warnings.length > 0 && <span className="warning-text">Soft pity can leave less probability for later tiers. <Help label={`${role} rate overlap`}>{validation.warnings.map((issue) => <p key={`${issue.path}-${issue.code}`}>{issue.message}</p>)}</Help></span>}
      {model.multiPull && <span>Each pack contains {model.multiPull.size} reward slots. The full action uses its configured resource cost. <Help label={`${role} pack guarantee`}>{model.multiPull.guaranteeRarity ? `At least one ${model.rarities.find((r) => r.id === model.multiPull!.guaranteeRarity)?.name} or higher. ` : model.multiPull.slots ? 'Explicit slot contents or tiers apply. ' : 'No minimum tier. '}Every slot executes even after early attainment. Costs may represent earned tickets, boxes or cash, as defined by the model.</Help></span>}
      {model.spark && <span>Trade saved exchange points for an eligible reward. <Help label={`${role} exchange effects`}>Reward choice: {model.spark.choice ?? 'missing-first'}. Eligible rewards: {model.spark.items?.join(', ') ?? 'positive-weight featured items'}. Draw counters and capture/charge protection are preserved unless this model declares reset effects. Resets: {JSON.stringify(model.spark.reset ?? 'none')}.</Help></span>}
    </div><p className="snapshot-id">Snapshot {hash.slice(0, 12)} <Help label={`${role} snapshot hash`}>SHA-256 of the canonical complete model. Object keys are sorted; array order is preserved because selection and pity precedence can depend on it. {hash}</Help></p></details>
    <details className="sample-details"><summary>Sample pulls</summary><p className="field-hint">These pulls illustrate a fresh player using seed {seed}. <Help label={`${role} sample pulls`}>A fresh-state illustration using seed {seed}. It is separate from the compared trial population. Comparison jobs use named per-event streams; this illustration uses the legacy sequential stream.</Help></p><div className="tape" aria-label={`${role} sample pulls`}>{sample.map((row, i) => <span key={i} className={row.item.featured ? 'chip featured' : 'chip'}>{i + 1} {row.item.name}{row.packGuaranteed ? ' · pack guarantee' : row.pityKind !== 'none' ? ` · ${row.pityKind} pity` : ''}</span>)}</div></details>
  </section>;
}
