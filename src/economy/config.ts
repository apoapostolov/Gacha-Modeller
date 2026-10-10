import { assertValidBanner } from '../engine/validation.ts';
import { createTrialExecutor } from '../engine/simulate.ts';
import { validateInitial } from '../engine/initial.ts';
import { cohortSeed } from '../engine/analysis.ts';
import type { Banner } from '../engine/types.ts';
import type { RunSettings } from '../project/project.ts';
import { ORIGINS, RESOURCE_SCALE, type EconomyConfig, type CalendarEvent } from './types.ts';

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function object(v: unknown, allowed: string[], path: string): asserts v is Record<string, unknown> {
  if (!isObject(v)) throw new Error(`${path}: Expected an object.`);
  for (const key of Object.keys(v)) if (!allowed.includes(key)) throw new Error(`${path}.${key}: Unsupported field.`);
}
function num(v: unknown, path: string, min = 0, max = 1000000000, integer = true): asserts v is number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isSafeInteger(v))) throw new Error(`${path}: Expected ${integer ? 'an integer' : 'a number'} from ${min} to ${max}.`);
}
function text(v: unknown, path: string) { if (typeof v !== 'string' || !v.trim() || v.length > 500) throw new Error(`${path}: Text up to 500 characters required.`); }
function list(v: unknown, path: string, min: number, max: number): asserts v is Record<string, unknown>[] {
  if (!Array.isArray(v) || v.length < min || v.length > max) throw new Error(`${path}: Expected ${min}–${max} entries.`);
}
function ids(rows: Record<string, unknown>[], path: string) {
  if (rows.some(r => typeof r.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(r.id)) || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error(`${path}.id: Unique ASCII IDs required.`);
}
export function resourceUnits(value: number): number {
  const units = Math.round(value * RESOURCE_SCALE);
  if (!Number.isSafeInteger(units) || Math.abs(units / RESOURCE_SCALE - value) > 1e-9) throw new Error('economy.resources: At most three resource decimal places are supported.');
  return units;
}
export function calendarOrder(a: CalendarEvent, b: CalendarEvent): number {
  const rank = ['expire-promotional', 'grant', 'season', 'banner-switch', 'target-switch'];
  return a.day - b.day || rank.indexOf(a.type) - rank.indexOf(b.type) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
export function validateEconomy(value: unknown, settings: RunSettings, models?: Banner[]): asserts value is EconomyConfig {
  const p = 'economy';
  object(value, ['version','evidence','name','cashCurrency','startDate','timeZone','days','trials','availableFromDay','availableThroughDay','dailyEarned','dailyPromotional','finance','offers','policies','calendar','utility','response','adverse'], p);
  if (value.version !== 1 || value.evidence !== 'synthetic') throw new Error('economy: Version 1 synthetic assumptions required.');
  text(value.name, p+'.name'); text(value.cashCurrency, p+'.cashCurrency');
  if (typeof value.cashCurrency !== 'string' || !/^[A-Z]{3}$/.test(value.cashCurrency)) throw new Error('economy.cashCurrency: Use a three-letter cash currency code, with 100 minor units per unit.');
  if (typeof value.startDate !== 'string' || !/^20\d\d-\d\d-\d\d$/.test(value.startDate) || !Number.isFinite(Date.parse(value.startDate)) || new Date(value.startDate).toISOString().slice(0,10) !== value.startDate) throw new Error('economy.startDate: Valid local calendar date required (2000–2099).');
  text(value.timeZone, p+'.timeZone');
  try { new Intl.DateTimeFormat('en', { timeZone: value.timeZone as string }); } catch { throw new Error('economy.timeZone: Valid IANA time zone required.'); }
  num(value.days, p+'.days', 1, 180); num(value.trials, p+'.trials', 1, 1000);
  num(value.availableFromDay, p+'.availableFromDay', 1, value.days);
  num(value.availableThroughDay, p+'.availableThroughDay', value.availableFromDay, value.days);
  num(value.dailyEarned, p+'.dailyEarned'); num(value.dailyPromotional, p+'.dailyPromotional');
  object(value.finance, ['feeBps','fixedFeeMinor','inclusiveTaxBps','refundBps','refundDelayDays','fulfilmentPerCopyMinor','activeDayCostMinor','promotionalUnitCostMinor','otherProductPerActiveDayMinor','convention'], p+'.finance');
  for (const k of ['feeBps','inclusiveTaxBps','refundBps']) num(value.finance[k], p+'.finance.'+k, 0, 10000);
  for (const k of ['fixedFeeMinor','fulfilmentPerCopyMinor','activeDayCostMinor','promotionalUnitCostMinor','otherProductPerActiveDayMinor']) num(value.finance[k], p+'.finance.'+k, 0, 100000);
  num(value.finance.refundDelayDays, p+'.finance.refundDelayDays', 0, 180); text(value.finance.convention, p+'.finance.convention');
  for (const side of ['response','adverse']) {
    object(value[side], ['attendanceMultiplier','purchaseMultiplier','costMultiplier','cannibalizationBps'], p+'.'+side);
    for (const k of ['attendanceMultiplier','purchaseMultiplier','costMultiplier']) num(value[side][k], p+'.'+side+'.'+k, 0, 3, false);
    num(value[side].cannibalizationBps, p+'.'+side+'.cannibalizationBps', 0, 10000);
  }
  list(value.offers, p+'.offers', 1, 8); ids(value.offers, p+'.offers');
  for (const o of value.offers) {
    object(o, ['id','name','kind','priceMinor','paid','promotional','startDay','endDay','limit','subscriptionDays','dailyPromotional'], p+'.offer'); text(o.name, p+'.offer.name');
    if (!['bundle','exact','subscription'].includes(String(o.kind))) throw new Error('economy.offer.kind: Unsupported offer.');
    num(o.priceMinor,p+'.offer.priceMinor',1,1000000); num(o.paid,p+'.offer.paid'); num(o.promotional,p+'.offer.promotional');
    num(o.startDay,p+'.offer.startDay',1,value.days); num(o.endDay,p+'.offer.endDay',o.startDay,value.days); num(o.limit,p+'.offer.limit',1,1000);
    num(o.subscriptionDays,p+'.offer.subscriptionDays',1,180); num(o.dailyPromotional,p+'.offer.dailyPromotional');
    if (o.kind !== 'exact' && Number(o.paid)+Number(o.promotional) === 0) throw new Error('economy.offer: An upfront credit is required.');
    if (o.kind === 'exact' && (o.paid !== 0 || o.promotional !== 0 || o.dailyPromotional !== 0)) throw new Error('economy.offer: Exact top-ups use priceMinor per whole resource unit and no bonus.');
    if (o.kind !== 'subscription' && o.dailyPromotional !== 0) throw new Error('economy.offer: Daily instalments require a subscription.');
  }
  list(value.policies,p+'.policies',1,4); ids(value.policies,p+'.policies');
  if(new Set(value.policies.map(g=>cohortSeed(settings.seed,'economy-'+g.id))).size!==value.policies.length) throw new Error('economy.policies: IDs collide in the seeded stream namespace; change an ID.');
  for (const g of value.policies) {
    object(g,['id','name','kind','weight','attendance','purchaseChance','actionsPerSession','sessionMinutes','minutesPerAction','dailyBudgetMinor','totalBudgetMinor','savingUntilDay','stopOnGoal','offerId','wallet','initialState'],p+'.policy'); text(g.name,p+'.policy.name');
    if (!['free','budget','goal','saver'].includes(String(g.kind))) throw new Error('economy.policy.kind: Unsupported policy family.');
    num(g.weight,p+'.policy.weight',0.000001,100000,false);
    num(g.attendance,p+'.policy.attendance',0,1,false); num(g.purchaseChance,p+'.policy.purchaseChance',0,1,false);
    num(g.actionsPerSession,p+'.policy.actionsPerSession',0,50); num(g.sessionMinutes,p+'.policy.sessionMinutes',1,240); num(g.minutesPerAction,p+'.policy.minutesPerAction',1,240);
    num(g.dailyBudgetMinor,p+'.policy.dailyBudgetMinor',0,1000000); num(g.totalBudgetMinor,p+'.policy.totalBudgetMinor',0,10000000); num(g.savingUntilDay,p+'.policy.savingUntilDay',1,value.days);
    if (typeof g.stopOnGoal !== 'boolean') throw new Error('economy.policy.stopOnGoal: Boolean required.');
    if (!value.offers.some(o=>o.id===g.offerId)) throw new Error('economy.policy.offerId: Existing offer required.');
    object(g.wallet,[...ORIGINS],p+'.policy.wallet'); for(const k of ORIGINS) num(g.wallet[k],p+'.policy.wallet.'+k);
    validateInitial(g.initialState);
    if (settings.initialState && Object.keys(g.initialState as object).length) throw new Error('economy.policy.initialState: Use either main initial progress or policy progress.');
  }
  list(value.calendar,p+'.calendar',0,40); ids(value.calendar,p+'.calendar');
  for (const e of value.calendar) {
    const extra = e.type==='grant' ? ['origin','amount'] : e.type==='season' ? ['seasonId'] : e.type==='banner-switch' ? ['model'] : e.type==='target-switch' ? ['targetId'] : [];
    object(e,['id','day','type',...extra],p+'.calendar'); num(e.day,p+'.calendar.day',1,value.days);
    if (!['grant','expire-promotional','season','banner-switch','target-switch'].includes(String(e.type))) throw new Error('economy.calendar.type: Unsupported event.');
    if(e.type==='grant') { if (!ORIGINS.includes(e.origin as typeof ORIGINS[number]) || e.origin==='paid') throw new Error('economy.calendar.origin: Free grants use earned or promotional origin.'); num(e.amount,p+'.calendar.amount'); }
    if(e.type==='season') text(e.seasonId,p+'.calendar.seasonId');
    if(e.type==='banner-switch') assertValidBanner(e.model);
    if(e.type==='target-switch') text(e.targetId,p+'.calendar.targetId');
  }
  object(value.utility,['version','name','rules','rosterBonus'],p+'.utility');
  if(value.utility.version!==1) throw new Error('economy.utility.version: Unsupported adapter version.'); text(value.utility.name,p+'.utility.name'); num(value.utility.rosterBonus,p+'.utility.rosterBonus',0,100000,false);
  list(value.utility.rules,p+'.utility.rules',0,24);
  if(new Set(value.utility.rules.map(r=>r.itemId)).size!==value.utility.rules.length) throw new Error('economy.utility.rules: Duplicate item.');
  for(const r of value.utility.rules) { object(r,['itemId','tag','copyValues'],p+'.utility.rule'); text(r.itemId,p+'.utility.itemId'); text(r.tag,p+'.utility.tag'); if(!Array.isArray(r.copyValues)||r.copyValues.length<1||r.copyValues.length>20)throw new Error('economy.utility.copyValues: One to twenty upgrade values required.'); for(const n of r.copyValues)num(n,p+'.utility.copyValue',0,100000,false); }
  if(settings.transitions?.length) throw new Error('economy.calendar: Calendar scenarios use day-based transitions; remove pull-based transitions.');
  if(settings.analysis?.cohorts?.length || settings.analysis?.experiment) throw new Error('economy: Run economy policies separately from starting-group or parameter experiments.');
  const possible = value.policies.reduce((n,g)=>n+Math.min(Number(g.actionsPerSession),Math.floor(Number(g.sessionMinutes)/Number(g.minutesPerAction))),0);
  const pool = [...models ?? [], ...value.calendar.filter(e=>e.type==='banner-switch').map(e=>e.model as Banner)];
  const packSize = settings.actionMode==='pack' ? Math.max(1,...pool.map(m=>m.multiPull?.size ?? 1)) : 1;
  if(value.days * value.trials * possible * packSize * 4 > 2000000 || value.days * value.trials * value.policies.length * 4 > 400000) throw new Error('economy: Reduce days, players or session actions. Limit: 2 million draw slots and 400,000 player-days across the four runs.');
  if(models) {
    const allIDs=new Set(pool.flatMap(m=>m.items.map(i=>i.id)));
    for(const rule of value.utility.rules) if(!allIDs.has(String(rule.itemId)))throw new Error('economy.utility.itemId: Item is absent from the model catalogue.');
    for (const starting of models) for(const policy of value.policies) {
      let model=starting, target=settings.targetId, season='initial';
      validateInitial(settings.initialState ?? policy.initialState,model);
      const verify=()=> { resourceUnits(model.pullCost.amount); resourceUnits(model.duplicates?.salvagePerCopy??0); resourceUnits(model.duplicates?.craftCost??0); if(model.pullCost.currency!==starting.pullCost.currency)throw new Error('economy.calendar: Currency unit must remain unchanged.'); createTrialExecutor(model,settings.goal,settings.sparkPolicy,{...settings,transitions:undefined,initialState:undefined,targetId:target}); };
      verify();
      for(const event of [...value.calendar as unknown as CalendarEvent[]].sort(calendarOrder)) {
        if(event.type==='banner-switch') { model=event.model; if(!model.items.some(i=>i.id===target&&i.featured))target=undefined; verify(); }
        if(event.type==='target-switch') { target=event.targetId; verify(); }
        if(event.type==='season') { if(event.seasonId===season)throw new Error('economy.calendar.seasonId: Each season transition needs a different current season.'); season=event.seasonId; }
      }
    }
    if(models[0]!.pullCost.currency!==models[1]!.pullCost.currency)throw new Error('economy: Baseline and candidate require the same resource currency.');
  }
}
export function defaultEconomy(models: Banner[]): EconomyConfig {
  const maxPack=Math.max(1,...models.map(m=>m.multiPull?.size??1));
  const actions=Math.min(3,Math.max(1,Math.floor(2000000/(90*4*maxPack*4))));
  const policy = (id: string, kind: 'free'|'budget'|'goal'|'saver'): EconomyConfig['policies'][number] => ({ id,name:kind==='free'?'Non-paying players':kind==='budget'?'Budget-limited players':kind==='goal'?'Goal-oriented players':'Saving players',kind,weight:1,attendance:.7,purchaseChance:1,actionsPerSession:actions,sessionMinutes:15,minutesPerAction:2,dailyBudgetMinor:500,totalBudgetMinor:3000,savingUntilDay:15,stopOnGoal:true,offerId:'bundle',wallet:{paid:0,earned:0,promotional:0},initialState:{} });
  const trials=Math.max(1,Math.min(100,Math.floor(2000000/(90*actions*4*maxPack*4))));
  return {version:1,evidence:'synthetic',name:'Synthetic 90-day economy',cashCurrency:'USD',startDate:'2026-10-01',timeZone:'UTC',days:90,trials,availableFromDay:1,availableThroughDay:90,dailyEarned:1000,dailyPromotional:0,
    finance:{feeBps:300,fixedFeeMinor:0,inclusiveTaxBps:0,refundBps:200,refundDelayDays:7,fulfilmentPerCopyMinor:0,activeDayCostMinor:1,promotionalUnitCostMinor:0,otherProductPerActiveDayMinor:0,convention:'Synthetic cash contribution. Tax is included in gross payment. Fees are retained after refunds; virtual credits are retained. Fixed costs and revenue recognition are excluded.'},
    offers:[{id:'bundle',name:'Currency bundle',kind:'bundle',priceMinor:500,paid:5000,promotional:1000,startDay:1,endDay:90,limit:20,subscriptionDays:30,dailyPromotional:0}],policies:[policy('free','free'),policy('budget','budget'),policy('goal','goal'),policy('saver','saver')],calendar:[],
    utility:{version:1,name:'Declared reward utility',rules:models[1]!.items.slice(0,24).map(i=>({itemId:i.id,tag:i.featured?'featured':'standard',copyValues:i.featured?[10,3,1]:[1,.2]})),rosterBonus:2},
    response:{attendanceMultiplier:1,purchaseMultiplier:1,costMultiplier:1,cannibalizationBps:0},adverse:{attendanceMultiplier:.8,purchaseMultiplier:.8,costMultiplier:1.2,cannibalizationBps:2000}};
}
