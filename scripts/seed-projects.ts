import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PRESETS } from '../src/presets/index.ts';
import { createProject, importProject, withSettings, type Project } from '../src/project/project.ts';
import type { Banner } from '../src/engine/types.ts';
import { defaultEvidence } from '../src/company/synthetic.ts';
const root = new URL('../projects/', import.meta.url);
const sections = [
  ['company','Company','Editable synthetic extracts, experiment diagnostics and decision records.',0],
  ['characters','Character collections','Cited acquisition shapes with synthetic character pools.',10],
  ['cosmetics','Cosmetic loot boxes','Cosmetic collections and box layouts with explicit model boundaries.',20],
  ['llamas','Fortnite-like llamas','Save the World reward examples: revealed offers and historical blind packs.',30],
  ['digital-packs','Digital card packs','Collection goals, duplicates, crafting and pack layouts.',40],
  ['original','Original systems','Synthetic mechanisms for comparative design studies.',50],
  ['workspace','Workspace','Imported and company-authored projects.',60],
] as const;
for (const [id,title,description,order] of sections) { await mkdir(new URL(`${id}/`, root), { recursive: true }); await writeFile(new URL(`${id}/section.json`, root), JSON.stringify({ format: 'reward-model-section', version: 1, id, title, description, order }, null, 2) + '\n', { flag: 'wx' }); }
async function save(section: string, project: Project, key: string) {
  const value = structuredClone(project); value.id = key;
  for (const [i, snapshot] of [value.baseline,value.candidate,...value.history].entries()) { snapshot.id = `${key}-snapshot-${i}`; snapshot.createdAt = '2026-10-10T00:00:00.000Z'; }
  await importProject(value);
  await writeFile(new URL(`${section}/${key}.json`, root), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
for (const model of PRESETS) { const section = model.family === 'original' ? 'original' : model.id === 'crate-lootbox' ? 'cosmetics' : 'characters'; const project = await createProject(model); await save(section, withSettings(project, { ...project.settings, trials: 1000 }), model.id); }
const cosmetic: Banner = {
  id: 'overwatch-legendary-like', name: 'Overwatch-like legendary cosmetic box', family: 'studied',
  blurb: 'Four cosmetic rewards with one guaranteed legendary slot. Remaining rates and rewards are synthetic.',
  source: 'Blizzard Season 15 patch notes, February 2025: https://overwatch.blizzard.com/en-gb/news/patch-notes/live/2025/02/',
  notes: ['Dated shape study: four items and at least one legendary in a Legendary Loot Box. No live reward table is copied.', 'Regular boxes have separate 5-box epic and 20-box legendary guarantees. This example models the legendary-box variant only; those regular-box counters are not implemented here.', 'Published 5.1% / 21.93% values are box-level occurrence probabilities. They are not used as per-slot rates.', 'Duplicate protection stays within rarity. Exhausted tiers discard overflow here; Blizzard bonus-box progress and season auto-opening are outside this example.', 'Slot cost is 0.25 earned boxes, so one four-slot action costs one box. It is not a cash price.'],
  pullCost: { amount: .25, currency: 'earned boxes' },
  rarities: [{ id: 'legendary', name: 'Legendary cosmetic', baseRate: .01, color: '#d4b483' },{ id: 'epic', name: 'Epic cosmetic', baseRate: .07, color: '#a59cd5' },{ id: 'rare', name: 'Rare cosmetic', baseRate: .25, color: '#90b7d5' },{ id: 'common', name: 'Common cosmetic', baseRate: 0, color: '#aaa594' }],
  pity: [], multiPull: { size: 4, slots: [{ rarity: 'legendary', quantity: 1 },{ quantity: 1 },{ quantity: 1 },{ quantity: 1 }] },
  items: ['legendary','epic','rare','common'].flatMap((rarity) => Array.from({ length: 8 }, (_, i) => ({ id: `${rarity}-${i}`, name: `${rarity === 'legendary' ? 'Legendary skin' : rarity === 'epic' ? 'Emote' : rarity === 'rare' ? 'Icon' : 'Spray'} ${i + 1}`, rarity, weight: 1, featured: rarity === 'legendary' }))),
  duplicates: { cap: 1, protection: 'same-rarity', overflow: 'discard', salvagePerCopy: 0 },
  provenance: { packs: { kind: 'cited-shape', source: 'https://overwatch.blizzard.com/en-gb/news/patch-notes/live/2025/02/', asOf: '2025-02-18' }, rates: { kind: 'synthetic', source: 'Synthetic remaining-slot rates; box probabilities are not slot probabilities.' }, duplicates: { kind: 'synthetic', source: 'Within-tier protection; exhausted tiers discard instead of granting bonus-box progress.' } },
};
let project = await createProject(cosmetic);
await save('cosmetics', withSettings(project, { ...project.settings, goal: { type: 'unique-featured', count: 8 }, actionMode: 'pack', maxPulls: 200, trials: 1000 }), cosmetic.id);
const llama: Banner = {
  id: 'fortnite-xray-like', name: 'Fortnite-like revealed X-Ray llama', family: 'studied',
  blurb: 'A fixed revealed offer containing a schematic, hero and materials. Content is known before selection.',
  source: 'Epic Save the World X-Ray announcement (2019) and store changes (2022): https://www.fortnite.com/news/loot-unboxing and https://www.fortnite.com/news/changes-to-save-the-world-store-and-llama-shop',
  notes: ['Save the World, not Battle Royale. X-Ray contents are revealed before purchase, so this configured offer is deterministic.', 'From v20.00, Epic removed V-Buck and real-money llama purchases in favour of earned X-Ray Tickets. This example uses earned-ticket cost only.', 'Synthetic offer contents and price; no current game price or reward table is claimed.', 'The engine executes this one known offer. Offer rotation, inspect/skip decisions and selection among revealed alternatives are not simulated.'],
  pullCost: { amount: 100 / 3, currency: 'earned X-Ray-like tickets' }, rarities: [{ id: 'reward', name: 'Revealed reward', baseRate: 0, color: '#d4b483' }], pity: [],
  multiPull: { size: 3, slots: [{ itemId: 'schematic', quantity: 1 },{ itemId: 'hero', quantity: 1 },{ itemId: 'materials', quantity: 20 }] },
  items: [{ id: 'schematic', name: 'Revealed schematic', rarity: 'reward', weight: 1, featured: true },{ id: 'hero', name: 'Revealed hero', rarity: 'reward', weight: 1 },{ id: 'materials', name: 'Material bundle', rarity: 'reward', weight: 1 }],
  provenance: { packs: { kind: 'cited-shape', source: 'https://www.fortnite.com/news/loot-unboxing', asOf: '2019-01-25' }, rates: { kind: 'synthetic', source: 'Known illustrative offer; no random opening or live pool.' } },
};
project = await createProject(llama);
await save('llamas', withSettings(project, { ...project.settings, goal: { type: 'targets', targets: [{ itemId: 'schematic', count: 1 },{ itemId: 'hero', count: 1 }] }, actionMode: 'pack', maxPulls: 30, trials: 1000 }), llama.id);
const blind = structuredClone(llama); blind.id = 'fortnite-historical-blind-like'; blind.name = 'Fortnite-like historical blind llama'; blind.blurb = 'A historical blind-pack contrast with synthetic random rewards and ticket price.'; blind.notes = ['Historical contrast to pre-2019 blind llamas, not the current Save the World store.', 'All item probabilities and ticket costs are synthetic. No live tables or real-money sales are asserted.']; blind.multiPull = { size: 3 }; blind.provenance = { packs: { kind: 'cited-shape', source: 'https://www.fortnite.com/news/loot-unboxing', asOf: '2019-01-25' }, rates: { kind: 'synthetic', source: 'Equal-weight illustrative pool.' } };
project = await createProject(blind); await save('llamas', withSettings(project, { ...project.settings, actionMode: 'pack', maxPulls: 90, trials: 1000 }), blind.id);
const cards: Banner = {
  id: 'collectible-card-pack', name: 'Synthetic collectible card pack', family: 'original', blurb: 'Five cards per pack, one rare card or better, with duplicate salvage and crafting.', source: 'original', notes: ['Original digital card design with synthetic probabilities and resource costs.', 'Collection goals include every card. Duplicate copies above two convert to shards; missing cards can be crafted.'], pullCost: { amount: 20, currency: 'earned card credits' },
  rarities: [{ id: 'mythic', name: 'Mythic card', baseRate: .025, color: '#d4b483' },{ id: 'rare', name: 'Rare card', baseRate: .15, color: '#90b7d5' },{ id: 'common', name: 'Common card', baseRate: 0, color: '#aaa594' }], pity: [], multiPull: { size: 5, guaranteeRarity: 'rare' }, items: ['mythic','rare','common'].flatMap((rarity) => Array.from({ length: 6 }, (_, i) => ({ id: `${rarity}-${i}`, name: `${rarity} card ${i + 1}`, rarity, weight: 1, featured: rarity === 'mythic' }))), duplicates: { cap: 2, protection: 'none', overflow: 'salvage', salvagePerCopy: 1, craftCost: 10 },
};
project = await createProject(cards); await save('digital-packs', withSettings(project, { ...project.settings, goal: { type: 'collection' }, actionMode: 'pack', craftPolicy: 'missing-targets', maxPulls: 500, trials: 1000 }), cards.id);
const company = structuredClone(await importProject(JSON.parse(await readFile(new URL('../docs/fixtures/company-economy.json', import.meta.url), 'utf8'))));
company.version = 5; company.company = defaultEvidence(); company.name = 'Synthetic company pilot';
await save('company', company, 'synthetic-company-pilot');
