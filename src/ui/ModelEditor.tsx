import { useId } from 'react';
import { validateBanner, type Banner, type PityRule } from '../engine/index.ts';
import { Drawer } from './Drawer.tsx';
import { Help } from './Help.tsx';

function NumberField({ label, value, onChange, optional = false, min = 0, max, step = 'any' }: { label: string; value?: number; onChange: (value: number | undefined) => void; optional?: boolean; min?: number; max?: number; step?: number | 'any' }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}</label><input id={id} type="number" min={min} max={max} step={step} value={value === undefined || Number.isNaN(value) ? '' : value} onChange={(e) => onChange(optional && e.target.value === '' ? undefined : e.target.valueAsNumber)} /></div>;
}
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId(); return <div className="field"><label htmlFor={id}>{label}</label><input id={id} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
export function ModelEditor({ draft, onChange, onClose, onSave, busy, error }: { draft: Banner; onChange: (model: Banner) => void; onClose: () => void; onSave: () => void; busy: boolean; error: string | null }) {
  const validation = validateBanner(draft);
  const patch = (change: (copy: Banner) => void) => { const copy = structuredClone(draft); change(copy); onChange(copy); };
  const tiers = (label: string, value: string, change: (value: string) => void, none = false) => <div className="field"><label>{label}<select value={value} onChange={(e) => change(e.target.value)}>{none && <option value="">No minimum tier</option>}{draft.rarities.map((r, i) => <option key={i} value={r.id}>{r.name || r.id || `Tier ${i + 1}`}</option>)}</select></label></div>;
  const unique = (prefix: string, ids: string[]) => { let i = 1; while (ids.includes(`${prefix}-${i}`)) i++; return `${prefix}-${i}`; };
  const renameTier = (copy: Banner, index: number, id: string) => {
    const old = copy.rarities[index]!.id; copy.rarities[index]!.id = id;
    copy.items.forEach((item) => { if (item.rarity === old) item.rarity = id; });
    copy.pity.forEach((pity) => { if (pity.rarity === old) pity.rarity = id; pity.resetAlso = pity.resetAlso?.map((r) => r === old ? id : r); });
    if (copy.featured?.rarity === old) copy.featured.rarity = id;
    if (copy.multiPull?.guaranteeRarity === old) copy.multiPull.guaranteeRarity = id;
    if (copy.spark?.reset?.rarityCounters) copy.spark.reset.rarityCounters = copy.spark.reset.rarityCounters.map((r) => r === old ? id : r);
  };
  return <Drawer title="Edit candidate" onClose={onClose} footer={<><span className="run-note">{validation.valid ? 'Ready to save a revision' : `${validation.errors.length} fields need attention`}</span><button className="primary" disabled={!validation.valid || busy} onClick={onSave}>{busy ? 'Saving…' : 'Save candidate'}</button></>}>
    <p className="run-note">The baseline stays locked. Unsaved edits stay in memory while this project is open.</p>
    {error && <p className="run-error" role="alert">{error}</p>}
    {!validation.valid && <div className="validation-list" role="status"><strong>Fix before saving</strong><ul>{validation.errors.map((issue, i) => <li key={i}><code>{issue.path}</code>: {issue.message}</li>)}</ul></div>}
    {validation.warnings.length > 0 && <p className="warning-text">Rate overlap <Help label="Candidate rate validation">{validation.warnings.map((issue, i) => <p key={i}>{issue.message}</p>)}</Help></p>}
    <details className="editor-group" open><summary>Identity & cost</summary><div className="editor-grid">
      <TextField label="Candidate name" value={draft.name} onChange={(v) => patch((c) => { c.name = v; })} />
      <TextField label="Model ID" value={draft.id} onChange={(v) => patch((c) => { c.id = v; })} />
      <NumberField label="Cost per pull" value={draft.pullCost.amount} onChange={(v) => patch((c) => { c.pullCost.amount = v!; })} />
      <TextField label="Currency unit" value={draft.pullCost.currency} onChange={(v) => patch((c) => { c.pullCost.currency = v; })} />
      <label className="field full-width">Description<textarea value={draft.blurb} onChange={(e) => patch((c) => { c.blurb = e.target.value; })} /></label>
      <label className="field full-width">Model notes<textarea value={draft.notes.join('\n')} onChange={(e) => patch((c) => { c.notes = e.target.value.split('\n'); })} /></label>
    </div></details>
    <details className="editor-group" open><summary>Rarities & rates <Help label="Rarity rates">Enter probabilities as fractions: 0.01 is 1%. Listed order sets rarity priority. The final tier is filler and receives the remaining interval. Reordering can change mechanic precedence.</Help></summary>
      {draft.rarities.map((rarity, i) => <div className="editor-row" key={i}><div className="editor-grid">
        <TextField label={`Tier ${i + 1} ID`} value={rarity.id} onChange={(v) => patch((c) => renameTier(c, i, v))} />
        <TextField label={`Tier ${i + 1} name`} value={rarity.name} onChange={(v) => patch((c) => { c.rarities[i]!.name = v; })} />
        {i < draft.rarities.length - 1 ? <NumberField label={`${rarity.name} base probability`} value={rarity.baseRate} max={1} onChange={(v) => patch((c) => { c.rarities[i]!.baseRate = v!; })} /> : <p className="run-note">Filler: remaining probability</p>}
        <TextField label={`${rarity.name} colour`} value={rarity.color} onChange={(v) => patch((c) => { c.rarities[i]!.color = v; })} />
      </div><div className="row-actions"><button className="text-button" disabled={i === 0} onClick={() => patch((c) => { [c.rarities[i - 1], c.rarities[i]] = [c.rarities[i]!, c.rarities[i - 1]!]; })}>Move up</button><button className="text-button" disabled={i === draft.rarities.length - 1} onClick={() => patch((c) => { [c.rarities[i], c.rarities[i + 1]] = [c.rarities[i + 1]!, c.rarities[i]!]; })}>Move down</button><button className="text-button danger" onClick={() => patch((c) => { c.rarities.splice(i, 1); })}>Remove tier {i + 1}</button></div></div>)}
      <button className="secondary" onClick={() => patch((c) => { const id = unique('tier', c.rarities.map((r) => r.id)); c.rarities.splice(Math.max(0, c.rarities.length - 1), 0, { id, name: 'New tier', baseRate: 0, color: '#d4b483' }); })}>Add rarity</button>
    </details>
    <details className="editor-group" open><summary>Pity protection</summary>
      {draft.rarities.slice(0, -1).map((rarity, i) => {
        const rule = draft.pity.find((p) => p.rarity === rarity.id);
        const changeRule = (change: (rule: PityRule) => void) => patch((c) => change(c.pity.find((p) => p.rarity === rarity.id)!));
        return <div className="editor-row" key={i}><label className="check-label"><input type="checkbox" checked={!!rule} onChange={(e) => patch((c) => { c.pity = c.pity.filter((p) => p.rarity !== rarity.id); if (e.target.checked) c.pity.push({ rarity: rarity.id, hardAt: 100 }); })} />{rarity.name} pity</label>
          {rule && <><NumberField label={`${rarity.name} hard pity`} value={rule.hardAt} min={1} max={100000} step={1} onChange={(v) => changeRule((r) => { r.hardAt = v!; })} />
            <label className="check-label"><input type="checkbox" checked={rule.softStart !== undefined} onChange={(e) => changeRule((r) => { if (e.target.checked) { r.softStart = Math.min(74, r.hardAt); r.softStep = .06; } else { delete r.softStart; delete r.softStep; } })} />Soft-pity ramp</label>
            {rule.softStart !== undefined && <div className="editor-grid"><NumberField label={`${rarity.name} soft start`} value={rule.softStart} min={1} step={1} onChange={(v) => changeRule((r) => { r.softStart = v!; })} /><NumberField label={`${rarity.name} soft increment`} value={rule.softStep} max={1} onChange={(v) => changeRule((r) => { r.softStep = v!; })} /></div>}
            <p className="field-heading">Also reset on this hit <Help label="Pity resets">The hit tier's counter resets and others increment. These additional counters then reset to zero.</Help></p>
            {draft.rarities.filter((r) => r.id !== rarity.id).map((other, j) => <label className="check-label" key={j}><input type="checkbox" checked={rule.resetAlso?.includes(other.id) ?? false} onChange={(e) => changeRule((r) => { r.resetAlso = (r.resetAlso ?? []).filter((id) => id !== other.id); if (e.target.checked) r.resetAlso.push(other.id); })} />Reset {other.name}</label>)}
          </>}
        </div>;
      })}
    </details>
    <details className="editor-group"><summary>Featured & charge</summary>
      <label className="check-label"><input type="checkbox" checked={!!draft.featured} onChange={(e) => patch((c) => { c.featured = e.target.checked ? { rarity: c.rarities[0]?.id ?? '', chance: .5, capturing: true } : undefined; })} />Featured rule</label>
      {draft.featured && <div className="editor-grid">
        {tiers('Featured tier', draft.featured.rarity, (v) => patch((c) => { c.featured!.rarity = v; }))}
        <NumberField label="Featured probability within tier" value={draft.featured.chance} max={1} onChange={(v) => patch((c) => { c.featured!.chance = v!; })} />
        <label className="check-label"><input type="checkbox" checked={draft.featured.capturing} onChange={(e) => patch((c) => { c.featured!.capturing = e.target.checked; })} />Capture after a miss</label>
        <NumberField label="Featured hard cap (optional)" value={draft.featured.hardAt} min={1} step={1} optional onChange={(v) => patch((c) => { c.featured!.hardAt = v; })} />
      </div>}
      <label className="check-label"><input type="checkbox" checked={!!draft.charge} onChange={(e) => patch((c) => { c.charge = e.target.checked ? { midAt: 100, midFeaturedChance: .5, hardAt: 200 } : undefined; })} />Charge checkpoints</label>
      {draft.charge && <div className="editor-grid"><NumberField label="Charge midpoint" value={draft.charge.midAt} min={1} step={1} onChange={(v) => patch((c) => { c.charge!.midAt = v!; })} /><NumberField label="Charge midpoint featured chance" value={draft.charge.midFeaturedChance} max={1} onChange={(v) => patch((c) => { c.charge!.midFeaturedChance = v!; })} /><NumberField label="Charge hard checkpoint" value={draft.charge.hardAt} min={1} step={1} onChange={(v) => patch((c) => { c.charge!.hardAt = v!; })} /></div>}
    </details>
    <details className="editor-group"><summary>Exchange</summary>
      <label className="check-label"><input type="checkbox" checked={!!draft.spark} onChange={(e) => patch((c) => { c.spark = e.target.checked ? { cost: 180 } : undefined; })} />Enable exchange shop</label>
      {draft.spark && <><NumberField label="Exchange bar cost" value={draft.spark.cost} min={Number.MIN_VALUE} onChange={(v) => patch((c) => { c.spark!.cost = v!; })} />
        <p className="field-heading">After an exchange <Help label="Exchange resets">By default, exchanges preserve all draw protection. Only the checked resets apply. An exchange does not increment draw counters or consume another purchased pull.</Help></p>
        {draft.rarities.map((r, i) => <label key={i} className="check-label"><input type="checkbox" checked={draft.spark?.reset?.rarityCounters?.includes(r.id) ?? false} onChange={(e) => patch((c) => { const reset = c.spark!.reset ??= {}; reset.rarityCounters = (reset.rarityCounters ?? []).filter((id) => id !== r.id); if (e.target.checked) reset.rarityCounters.push(r.id); })} />Reset exchange {r.name} counter</label>)}
        <label className="check-label"><input type="checkbox" checked={draft.spark.reset?.featuredArmed ?? false} onChange={(e) => patch((c) => { (c.spark!.reset ??= {}).featuredArmed = e.target.checked; })} />Clear capture protection</label>
        <label className="check-label"><input type="checkbox" checked={draft.spark.reset?.sinceFeatured ?? false} onChange={(e) => patch((c) => { (c.spark!.reset ??= {}).sinceFeatured = e.target.checked; })} />Reset featured-since counter</label>
      </>}
    </details>
    <details className="editor-group"><summary>Pack purchase</summary>
      <label className="check-label"><input type="checkbox" checked={!!draft.multiPull} onChange={(e) => patch((c) => { c.multiPull = e.target.checked ? { size: 10 } : undefined; })} />Enable whole-pack action</label>
      {draft.multiPull && <div className="editor-grid"><NumberField label="Pack size" value={draft.multiPull.size} min={1} max={1000} step={1} onChange={(v) => patch((c) => { c.multiPull!.size = v!; })} />{tiers('Pack minimum tier', draft.multiPull.guaranteeRarity ?? '', (v) => patch((c) => { c.multiPull!.guaranteeRarity = v || undefined; }), true)}</div>}
      <p className="run-note">Repeated slots with replacement <Help label="Supported pack rules">Fixed size and one minimum-tier guarantee. Slot correlations, quantities, no-replacement pools and batch discounts are not supported yet.</Help></p>
    </details>
    <details className="editor-group"><summary>Item catalogue</summary>
      {draft.items.map((item, i) => <div className="editor-row" key={i}><div className="editor-grid"><TextField label={`Item ${i + 1} ID`} value={item.id} onChange={(v) => patch((c) => { c.items[i]!.id = v; })} /><TextField label={`Item ${i + 1} name`} value={item.name} onChange={(v) => patch((c) => { c.items[i]!.name = v; })} />{tiers(`Item ${i + 1} tier`, item.rarity, (v) => patch((c) => { c.items[i]!.rarity = v; }))}<NumberField label={`Item ${i + 1} weight`} value={item.weight} onChange={(v) => patch((c) => { c.items[i]!.weight = v!; })} /><label className="check-label"><input type="checkbox" checked={item.featured ?? false} onChange={(e) => patch((c) => { c.items[i]!.featured = e.target.checked; })} />Item {i + 1} featured</label></div><button className="text-button danger" onClick={() => patch((c) => { c.items.splice(i, 1); })}>Remove item {i + 1}</button></div>)}
      <button className="secondary" onClick={() => patch((c) => { c.items.push({ id: unique('item', c.items.map((i) => i.id)), name: 'New item', rarity: c.rarities.at(-1)?.id ?? '', weight: 1 }); })}>Add item</button>
    </details>
    <details className="editor-group"><summary>Original modifiers</summary><div className="editor-grid">
      <NumberField label="Collection heat (optional)" value={draft.mechanics?.collectionHeat} max={1000} optional onChange={(v) => patch((c) => { (c.mechanics ??= {}).collectionHeat = v; })} />
      <NumberField label="Audience spark per pull (optional)" value={draft.mechanics?.audienceSparkPerPull} max={1000} optional onChange={(v) => patch((c) => { (c.mechanics ??= {}).audienceSparkPerPull = v; })} />
      <NumberField label="Pool-share players (optional)" value={draft.mechanics?.poolSharePlayers} min={1} max={1000} step={1} optional onChange={(v) => patch((c) => { (c.mechanics ??= {}).poolSharePlayers = v; })} />
    </div><p className="run-note">Group outcomes are a separate learning scenario <Help label="Pool-share scope">The main comparison is a fresh single-player pursuit. The pool-share modifier is used by the separate shared-counter teaching scenario, not by the main acquisition curves.</Help></p></details>
  </Drawer>;
}
