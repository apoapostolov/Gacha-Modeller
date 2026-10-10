import { describe, expect, it } from 'vitest';
import { ResourceLedger, debit, contribution } from '../src/economy/ledger.ts';
import { defaultEconomy, validateEconomy, resourceUnits } from '../src/economy/config.ts';
import { runEconomyPlayer, civilDate, utilityValue } from '../src/economy/simulate.ts';
import { compareEconomy } from '../src/jobs/economy.ts';
import { createProject, importProject, withSettings } from '../src/project/project.ts';
import { compareProject } from '../src/jobs/compare.ts';
import { hardPityBaseline } from '../src/presets/index.ts';
import type { RunSettings } from '../src/project/project.ts';
function fixture() {
  const model=structuredClone(hardPityBaseline);model.rarities[0]!.baseRate=1;
  const config=defaultEconomy([model,model]);config.days=2;config.trials=1;config.availableThroughDay=2;config.dailyEarned=0;config.policies=config.policies.slice(1,2);
  const policy=config.policies[0]!;Object.assign(policy,{attendance:1,actionsPerSession:1,stopOnGoal:false,savingUntilDay:1});
  const offer=config.offers[0]!;offer.endDay=2;
  const settings:RunSettings={goal:{type:'budget',pulls:2},trials:30,seed:42,sparkPolicy:'never',actionMode:'single',maxPulls:2};
  return {model,config,policy,offer,settings};
}
describe('atomic resources and cash',()=>{
  it('deduplicates matching IDs and rejects collisions without altering balances',()=>{
    const ledger=new ResourceLedger({paid:1000,earned:0,promotional:0});
    const event={id:'a',day:1,kind:'draw',wallet:{paid:-500},inventory:{reward:1}};
    expect(ledger.apply(event)).toBe(true);expect(ledger.apply(event)).toBe(false);
    expect(()=>ledger.apply({...event,wallet:{paid:-100}})).toThrow('Conflicting');
    expect(ledger.view().wallet.paid).toBe(500);expect(ledger.view().inventory.reward).toBe(1);expect(ledger.reconcile()).toBe(true);
  });
  it('rolls back every effect when any part of an action fails',()=>{
    const ledger=new ResourceLedger({paid:100,earned:0,promotional:0});
    expect(()=>ledger.apply({id:'bad',day:1,kind:'pack',wallet:{paid:-101},inventory:{reward:5},cash:{payments:100}})).toThrow('Insufficient');
    expect(ledger.eventCount).toBe(0);expect(ledger.view().cash.payments).toBe(0);expect(ledger.view().inventory.reward).toBeUndefined();
    expect(()=>ledger.apply({id:'bad',day:1,kind:'refund',cash:{refunds:1}})).toThrow('Refund');
  });
  it('spends promotional, earned and paid resources in declared order',()=>{
    expect(debit({paid:1000,earned:200,promotional:300},700)).toEqual({promotional:-300,earned:-200,paid:-200});
    expect(debit({paid:1,earned:0,promotional:0},2)).toBeNull();expect(()=>resourceUnits(.0001)).toThrow('three');
  });
  it('reconciles the hand-calculated tax, fee, refund and fulfilment waterfall',()=>{
    const {model,config,policy,settings}=fixture();Object.assign(config.finance,{inclusiveTaxBps:2000,feeBps:300,fixedFeeMinor:10,refundBps:2000,refundDelayDays:1,activeDayCostMinor:2,fulfilmentPerCopyMinor:3,promotionalUnitCostMinor:2});
    const result=runEconomyPlayer(model,settings,config,policy,0,undefined,100);
    expect(result.closing.cash).toMatchObject({payments:500,refunds:100,tax:66,fees:25,service:4,fulfilment:6,promotion:2});
    expect(contribution(result.closing.cash)).toBe(297);expect(result.closing.wallet).toEqual({paid:4000,earned:0,promotional:0});expect(result.reconciled).toBe(true);
  });
  it('keeps future refunds outside the horizon and discloses their obligation',()=>{
    const {model,config,policy,settings}=fixture();config.finance.refundBps=2000;config.finance.refundDelayDays=3;
    const result=runEconomyPlayer(model,settings,config,policy,0);expect(result.closing.cash.refunds).toBe(0);expect(result.days[1]!.pendingRefundMinor).toBe(100);
  });
  it('does not create cash payments from initial paid or earned balances',()=>{
    const {model,config,policy,settings}=fixture();policy.wallet={paid:1000,earned:1000,promotional:0};
    const result=runEconomyPlayer(model,settings,config,policy,0);expect(result.closing.cash.payments).toBe(0);expect(result.days[1]!.pulls).toBe(2);
  });
  it('exports complete aggregate movements when event storage is truncated',()=>{
    const {model,config,policy,settings}=fixture();const r=runEconomyPlayer(model,settings,config,policy,0,undefined,1);expect(r.truncated).toBe(true);expect(r.events.length).toBe(1);
    for(const origin of ['paid','earned','promotional'] as const)expect(r.opening.wallet[origin]+r.movements.wallet[origin]).toBe(r.closing.wallet[origin]);
    expect(r.movements.cash.payments).toBe(r.closing.cash.payments);expect(r.opening.shards+r.movements.shards).toBe(r.closing.shards);
  });
});
describe('calendar, offer and policy semantics',()=>{
  it('enforces daily and total gross budgets even with refunds',()=>{
    const {model,config,policy,offer,settings}=fixture();offer.paid=1000;offer.promotional=0;config.finance.refundBps=10000;config.finance.refundDelayDays=0;policy.totalBudgetMinor=500;
    const result=runEconomyPlayer(model,settings,config,policy,0);expect(result.closing.cash.payments).toBe(500);expect(result.closing.cash.refunds).toBe(500);expect(result.days[1]!.pulls).toBe(1);
    policy.dailyBudgetMinor=499;expect(runEconomyPlayer(model,settings,config,policy,0).closing.cash.payments).toBe(0);
  });
  it('honours non-paying and saving policies independently of affordability',()=>{
    const {model,config,policy,settings}=fixture();policy.kind='free';expect(runEconomyPlayer(model,settings,config,policy,0).days[1]!.pulls).toBe(0);
    policy.kind='saver';policy.savingUntilDay=2;config.dailyEarned=1000;const r=runEconomyPlayer(model,settings,config,policy,0);expect(r.days[0]!.pulls).toBe(0);expect(r.days[1]!.pulls).toBe(1);expect(r.closing.cash.payments).toBe(0);
  });
  it('honours offer windows and limits, with residual bundle currency',()=>{
    const {model,config,policy,offer,settings}=fixture();offer.startDay=2;expect(runEconomyPlayer(model,settings,config,policy,0).days.map(d=>d.pulls)).toEqual([0,1]);
    offer.startDay=1;offer.paid=1000;offer.promotional=0;offer.limit=1;expect(runEconomyPlayer(model,settings,config,policy,0).days[1]!.pulls).toBe(1);
  });
  it('rounds exact top-ups once without inventing bonus credits',()=>{
    const {model,config,policy,offer,settings}=fixture();offer.kind='exact';offer.paid=0;offer.promotional=0;offer.priceMinor=125;policy.wallet.earned=250;
    const result=runEconomyPlayer(model,settings,config,policy,0);expect(result.closing.cash.payments).toBe(94+125);expect(result.closing.wallet.paid).toBe(0);
  });
  it('charges packs completely and never advances an unaffordable pack',()=>{
    const {model,config,policy,offer,settings}=fixture();model.multiPull={size:2};settings.actionMode='pack';settings.maxPulls=2;
    offer.paid=1000;offer.promotional=0;policy.dailyBudgetMinor=1000;const r=runEconomyPlayer(model,settings,config,policy,0);expect(r.closing.cash.payments).toBe(1000);expect(r.days[0]!.pulls).toBe(2);
    policy.dailyBudgetMinor=999;const blocked=runEconomyPlayer(model,settings,config,policy,0);expect(blocked.days[1]!.pulls).toBe(0);expect(blocked.closing.cash.payments).toBe(0);
  });
  it('credits subscriptions only for attended instalments without overlap',()=>{
    const {model,config,policy,offer,settings}=fixture();offer.kind='subscription';offer.paid=1000;offer.promotional=0;offer.dailyPromotional=1000;offer.subscriptionDays=2;
    const r=runEconomyPlayer(model,settings,config,policy,0);expect(r.closing.cash.payments).toBe(500);expect(r.closing.wallet).toEqual({paid:1000,earned:0,promotional:0});
  });
  it('orders expiry before new grants and preserves civil dates across DST',()=>{
    const {model,config,policy,settings}=fixture();policy.wallet.promotional=9000;policy.actionsPerSession=0;config.calendar=[{id:'new',day:1,type:'grant',origin:'promotional',amount:1000},{id:'old',day:1,type:'expire-promotional'}];
    expect(runEconomyPlayer(model,settings,config,policy,0).closing.wallet.promotional).toBe(1000);expect(civilDate('2026-10-24',3)).toBe('2026-10-26');
    config.timeZone='Europe/Kyiv';validateEconomy(config,settings,[model,model]);
  });
  it('retains inventories but resets declared season protection',()=>{
    const {model,config,policy,settings}=fixture();model.rarities[0]!.baseRate=0;policy.initialState={counters:{[model.pity[0]!.rarity]:50}};policy.kind='free';policy.wallet.earned=2000;
    config.calendar=[{id:'season',day:2,type:'season',seasonId:'second'}];const r=runEconomyPlayer(model,settings,config,policy,0);expect(r.protection.counters![model.pity[0]!.rarity]).toBe(1);expect(Object.values(r.closing.inventory).reduce((n,v)=>n+v,0)).toBe(2);
  });
  it('uses declared useful-copy curves and tag coverage independently of rarity',()=>{
    const {config}=fixture();config.utility={version:1,name:'Roster',rosterBonus:2,rules:[{itemId:'x',tag:'healer',copyValues:[4,1]},{itemId:'y',tag:'tank',copyValues:[0]}]};
    expect(utilityValue(config,{x:99,y:1})).toEqual({value:7,coverage:1});
  });
  it('enforces session time before either payments or draw actions',()=>{
    const {model,config,policy,settings}=fixture();policy.actionsPerSession=50;policy.sessionMinutes=1;policy.minutesPerAction=2;
    const r=runEconomyPlayer(model,settings,config,policy,0);expect(r.days[1]!.pulls).toBe(0);expect(r.closing.cash.payments).toBe(0);expect(r.days[1]!.activeDays).toBe(2);
  });
  it('excludes starting useful inventory from newly gained utility',()=>{
    const {model,config,policy,settings}=fixture();const item=model.items[0]!.id;policy.initialState={inventory:{[item]:1}};policy.actionsPerSession=0;
    config.utility={version:1,name:'Declared',rules:[{itemId:item,tag:'useful',copyValues:[10]}],rosterBonus:1};
    const r=runEconomyPlayer(model,settings,config,policy,0);expect(r.firstUsefulDay).toBeNull();expect(r.days[1]!.utility).toBe(0);expect(r.days[1]!.rosterCoverage).toBe(1);
  });
  it('reconciles shard crafting and duplicate overflow without new cash',()=>{
    const {model,config,policy,settings}=fixture();const item=model.items[0]!.id;
    model.duplicates={cap:2,protection:'none',overflow:'salvage',salvagePerCopy:1,craftCost:2,craftableItems:[item]};
    settings.goal={type:'copies',count:2};settings.targetId=item;settings.craftPolicy='missing-targets';policy.initialState={inventory:{[item]:1},salvage:2};policy.wallet.earned=2000;
    const r=runEconomyPlayer(model,settings,config,policy,0,undefined,100);expect(r.events.find(e=>e.kind==='craft')).toMatchObject({shards:-2000,inventory:{[item]:1}});expect(r.closing.inventory[item]).toBe(2);expect(r.closing.shards).toBe(2000);expect(r.closing.cash.payments).toBe(0);expect(r.reconciled).toBe(true);
  });
  it('migrates banner and target protection with wallets and inventory retained',()=>{
    const {model,config,policy,settings}=fixture();const destination=structuredClone(model);destination.id='destination';destination.name='Destination';
    const target={...destination.items[0]!,id:'new-target',name:'New target',featured:true};destination.items.push(target);
    policy.initialState={inventory:{[model.items[0]!.id]:1}};policy.wallet.earned=5000;policy.actionsPerSession=0;
    config.calendar=[{id:'target',day:2,type:'target-switch',targetId:target.id},{id:'banner',day:2,type:'banner-switch',model:destination}];
    validateEconomy(config,settings,[model,model]);const r=runEconomyPlayer(model,settings,config,policy,0,undefined,100);
    expect(r.closing.inventory[model.items[0]!.id]).toBe(1);expect(r.closing.wallet.earned).toBe(5000);expect(r.events.filter(e=>['banner-switch','target-switch'].includes(e.kind)).map(e=>e.kind)).toEqual(['banner-switch','target-switch']);expect(r.reconciled).toBe(true);
  });
  it('does not credit missed subscription instalments',()=>{
    const {model,config,policy,offer,settings}=fixture();config.days=7;config.availableThroughDay=7;offer.endDay=7;offer.kind='subscription';offer.subscriptionDays=7;offer.paid=1000;offer.promotional=0;offer.dailyPromotional=1000;policy.attendance=.5;policy.actionsPerSession=0;
    // A purchase requires a draw action; starting with one action then the two-pull horizon preserves later attendance.
    policy.actionsPerSession=1;const r=runEconomyPlayer(model,settings,config,policy,0,undefined,100);const bought=r.events.find(e=>e.kind==='cash-purchase')!;
    expect(bought).toBeDefined();expect(r.days.some(d=>!d.active)).toBe(true);expect(r.events.filter(e=>e.kind==='subscription-instalment').length).toBe(r.days.filter(d=>d.active&&d.day>bought.day).length);
  });
});
describe('scenario boundaries and portable comparisons',()=>{
  it('rejects invalid IDs, budgets, unsupported overlaps and excessive work before execution',()=>{
    const {model,config,settings}=fixture();validateEconomy(config,settings,[model,model]);
    const bad=structuredClone(config);bad.policies[0]!.totalBudgetMinor=-1;expect(()=>validateEconomy(bad,settings,[model,model])).toThrow('totalBudget');
    expect(()=>validateEconomy(config,{...settings,transitions:[{atPull:1,type:'season',seasonId:'next'}]},[model,model])).toThrow('day-based');
    bad.policies[0]!.totalBudgetMinor=1000;bad.days=180;bad.trials=1000;bad.policies[0]!.actionsPerSession=50;bad.policies[0]!.sessionMinutes=240;bad.policies[0]!.minutesPerAction=1;expect(()=>validateEconomy(bad,settings,[model,model])).toThrow('Limit');
  });
  it('sizes pack defaults within the declared work bound and rejects fractional shard precision',()=>{
    const {model,settings}=fixture();model.multiPull={size:10};const config=defaultEconomy([model,model]);validateEconomy(config,{...settings,actionMode:'pack',maxPulls:100,goal:{type:'budget',pulls:100}},[model,model]);expect(config.trials).toBe(46);
    model.duplicates={cap:2,protection:'none',overflow:'salvage',salvagePerCopy:.0001};expect(()=>validateEconomy(config,settings,[model,model])).toThrow('three');
  });
  it('keeps maximum-size pack defaults executable and rejects silent conversion truncation',()=>{
    const {model,settings,config,policy}=fixture();model.multiPull={size:1000};const huge=defaultEconomy([model,model]);validateEconomy(huge,{...settings,actionMode:'pack',maxPulls:1000,goal:{type:'budget',pulls:1000}},[model,model]);expect(huge.policies[0]!.actionsPerSession).toBe(1);
    model.spark={cost:1,reset:{}};settings.sparkPolicy='if-needed';settings.goal={type:'copies',count:101};policy.initialState={sparkProgress:101};
    expect(()=>runEconomyPlayer(model,settings,config,policy,0)).toThrow('100 automatic exchanges');
  });
  it('includes inactive eligible players and separates immature day windows',async()=>{
    const {model,config,settings}=fixture();config.policies[0]!.attendance=0;const r=await compareEconomy([model,model],settings,config);
    expect(r.scenarios[0]!.windows.find(w=>w.day===2)!.baseline!.activeDays).toBe(0);expect(r.scenarios[0]!.windows.find(w=>w.day===7)).toMatchObject({mature:false,baseline:null});expect(r.reconciledPlayers).toBe(4);
  });
  it('reports cumulative cohort outcomes at every season boundary',async()=>{
    const {model,config,settings}=fixture();config.calendar=[{id:'second',day:2,type:'season',seasonId:'second'}];const r=await compareEconomy([model,model],settings,config);
    expect(r.scenarios[0]!.windows.map(w=>w.day)).toEqual([1,2,7,30,90]);expect(r.groups[0]!.windows.find(w=>w.day===1)?.baseline?.activeDays).toBe(1);expect(r.groups[0]!.windows.find(w=>w.day===2)?.baseline?.activeDays).toBe(2);
  });
  it('keeps weighted results and streams stable after policy reordering',async()=>{
    const {model,config,settings}=fixture();config.policies.push({...structuredClone(config.policies[0]!),id:'inactive',name:'Inactive',weight:3,attendance:0});
    const first=await compareEconomy([model,model],settings,config);config.policies.reverse();const next=await compareEconomy([model,model],settings,config);
    expect(first.scenarios).toEqual(next.scenarios);expect(first.groups).toEqual(next.groups);expect(first.scenarios[0]!.windows.find(w=>w.day===2)!.baseline!.payerShare).toBe(.25);
  });
  it('keeps no-uplift economics fixed and discloses adverse portfolio costs',async()=>{
    const {model,config,settings}=fixture();config.finance.otherProductPerActiveDayMinor=100;config.adverse={attendanceMultiplier:1,purchaseMultiplier:1,costMultiplier:1,cannibalizationBps:5000};
    const r=await compareEconomy([model,model],settings,config);const no=r.scenarios[0]!.windows.find(w=>w.day===2)!;expect(no.baseline).toEqual(no.candidate);
    const adverse=r.scenarios[2]!.windows.find(w=>w.day===2)!;expect(adverse.candidate!.cash.cannibalization).toBe(100);expect(adverse.baseline!.contributionMinor-adverse.candidate!.contributionMinor).toBe(100);
  });
  it('exports version-4 settings and reproduces the complete economy report',async()=>{
    const {model,config,settings}=fixture();const p=withSettings(await createProject(model),{...settings,economy:config});const r=await compareProject(p,p.settings);
    expect(r.version).toBe(4);expect(r.engineVersion).toBe('economy-5');const imported=await importProject(JSON.parse(JSON.stringify(r)));expect((await compareProject(imported,imported.settings)).economy).toEqual(r.economy);
    expect(()=>withSettings(p,{...p.settings,economy:{...config,unexpected:1} as typeof config})).toThrow('Unsupported');
    await expect(importProject({...r,version:3,engineVersion:'analysis-4'})).rejects.toThrow('version 4');await expect(importProject({...p,version:3})).rejects.toThrow('version 4');
  });
});
