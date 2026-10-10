import type { Banner } from '../engine/types.ts';
import type { RunSettings } from '../project/project.ts';
import { meanError, type Interval } from '../engine/uncertainty.ts';
import { cohortSeed } from '../engine/analysis.ts';
import { validateEconomy } from '../economy/config.ts';
import { runEconomyPlayer, NO_RESPONSE } from '../economy/simulate.ts';
import { CASH_FIELDS, ORIGINS, type Cash, type DayResult, type EconomyConfig, type PlayerResult, type Wallet } from '../economy/types.ts';

export interface EconomyMeasures {
  completion: number; usefulReward: number; activeDays: number; pointReturn: number | null; rollingReturn: number | null;
  pulls: number; payerShare: number; repeatPayerShare: number; utility: number; rosterCoverage: number;
  wallet: Wallet; cash: Cash; contributionMinor: number; pendingRefundMinor: number;
}
export interface EconomyWindow {
  day: number; mature: boolean; baseline: EconomyMeasures | null; candidate: EconomyMeasures | null;
  contributionInterval: Interval | null;
}
export interface EconomyReport {
  version: 1; engineVersion: 'economy-5'; metricVersion: 'cash-contribution-v1'; evidence: 'synthetic';
  config: EconomyConfig; resourceCurrency: string; trialsPerPolicy: number;
  scenarios: { id: 'no-uplift'|'response'|'adverse'; name: string; windows: EconomyWindow[]; requiredPopulationMultiplier: number | null }[];
  groups: { policy: EconomyConfig['policies'][number]; seed: number; share: number; windows: EconomyWindow[] }[];
  traces: { policyId: string; side: 'baseline'|'candidate'; trialIndex: 0; result: PlayerResult }[];
  reconciledPlayers: number; totalPlayers: number; assumptions: string[];
}
interface Sample { windows: Map<number,DayResult>; active: Set<number>; firstUsefulDay: number|null }
const empty=():EconomyMeasures=>({completion:0,usefulReward:0,activeDays:0,pointReturn:0,rollingReturn:0,pulls:0,payerShare:0,repeatPayerShare:0,utility:0,rosterCoverage:0,wallet:{paid:0,earned:0,promotional:0},cash:Object.fromEntries(CASH_FIELDS.map(k=>[k,0])) as Cash,contributionMinor:0,pendingRefundMinor:0});
function summarize(rows: Sample[],day:number): EconomyMeasures {
  const out=empty();
  for(const row of rows) {
    const d=row.windows.get(day)!;
    out.completion+=Number(d.complete); out.usefulReward+=Number(row.firstUsefulDay!==null&&row.firstUsefulDay<=day);
    out.activeDays+=d.activeDays; out.pointReturn!+=Number(row.active.has(day)); out.rollingReturn!+=Number([...row.active].some(v=>v>=Math.max(1,day-6)&&v<=day));
    out.pulls+=d.pulls;out.payerShare+=Number(d.purchases>0);out.repeatPayerShare+=Number(d.purchases>1);out.utility+=d.utility;out.rosterCoverage+=d.rosterCoverage;out.contributionMinor+=d.contributionMinor;out.pendingRefundMinor+=d.pendingRefundMinor;
    for(const k of ORIGINS)out.wallet[k]+=d.wallet[k];for(const k of CASH_FIELDS)out.cash[k]+=d.cash[k];
  }
  for(const k of Object.keys(out) as (keyof EconomyMeasures)[])if(typeof out[k]==='number')(out[k] as number)/=rows.length;
  for(const k of ORIGINS)out.wallet[k]/=rows.length;for(const k of CASH_FIELDS)out.cash[k]/=rows.length;
  return out;
}
function addWeighted(out: EconomyMeasures, next: EconomyMeasures, share: number) {
  for(const k of Object.keys(out) as (keyof EconomyMeasures)[])if(typeof out[k]==='number')(out[k] as number)+=(next[k] as number)*share;
  for(const k of ORIGINS)out.wallet[k]+=next.wallet[k]*share;for(const k of CASH_FIELDS)out.cash[k]+=next.cash[k]*share;
}
export async function compareEconomy(models: Banner[],settings: RunSettings,config: EconomyConfig,progress:(count:number)=>void=()=>{}):Promise<EconomyReport> {
  validateEconomy(config,settings,models);
  const seasonEnds=config.calendar.filter(e=>e.type==='season'&&e.day>1).map(e=>e.day-1);
  const windows=[...new Set([7,30,90,config.days,...seasonEnds])].sort((a,b)=>a-b);
  const policies=[...config.policies].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),totalWeight=policies.reduce((n,p)=>n+p.weight,0);
  const report:EconomyReport={version:1,engineVersion:'economy-5',metricVersion:'cash-contribution-v1',evidence:'synthetic',config:structuredClone(config),resourceCurrency:models[0]!.pullCost.currency,trialsPerPolicy:config.trials,scenarios:[],groups:[],traces:[],reconciledPlayers:0,totalPlayers:4*config.trials*policies.length,assumptions:[
    'Cash contribution is receipts less refunds, inclusive tax, retained payment fees, fulfilment, service and declared promotion costs, plus other-product contribution less displacement. It is not recognized revenue or statutory profit. Fixed costs, accruals and discounting are excluded.',
    'All attendance, purchase, utility and treatment responses are synthetic declared assumptions. Day return is assumed attendance, not measured retention, satisfaction or excitement. Completion does not automatically change attendance.',
    'Every policy receives the full trial count. Population shares are fixed, not estimated. Main mechanical results are separate from the calendar scenario.',
    'Day 1 is the starting local calendar date. Events operate on civil days in the declared IANA zone, without intraday timestamps. Reports include D7/D30/D90, the final day and each season end. Outcomes are cumulative from assignment rather than reset per season. Offers use inclusive day ranges. Expiry, grants, season, banner and target transitions have deterministic order before attendance.',
    'Paid, earned and promotional resources retain provenance; consumption uses promotional, earned, then paid balances. Cash purchase budgets count gross payments and are not restored by refunds. Refunds retain credits and payment fees; tax reverses proportionally. Outstanding refunds beyond the horizon are shown separately.',
    'Subscriptions credit upfront resources and the first daily instalment at purchase; later instalments require attendance within the subscription term. No automatic renewal or overlap is allowed. Bundle quantities may be bought in one atomic payment.',
    'Utility is a versioned item/copy/tag adapter in subjective units. Starting utility is excluded from gained utility. No mapping to enjoyment, currency or money is implied.',
    'Contribution intervals use paired trial streams and independent policy samples with fixed shares. Large-sample normal approximations require at least 30 players per policy and observed variance; heavy tails and behavioural uncertainty are not covered. Scenario ranges are sensitivity cases, not confidence intervals.',
    'Population break-even assumes proportional scaling of the entire eligible population with unchanged per-player economics. It is unavailable for a non-positive candidate contribution, and does not predict achievable demand.'
  ]};
  const variants=[{id:'no-uplift' as const,name:'No assumed response',response:NO_RESPONSE},{id:'response' as const,name:'Declared candidate response',response:config.response},{id:'adverse' as const,name:'Adverse candidate response',response:config.adverse}];
  const weighted:EconomyWindow[][]=variants.map(()=>windows.map(day=>({day,mature:day<=config.days,baseline:day<=config.days?empty():null,candidate:day<=config.days?empty():null,contributionInterval:null})));
  const variances=variants.map(()=>windows.map(()=>0));
  for(const policy of policies) {
    const share=policy.weight/totalWeight,baseline:Sample[]=[],candidates:Sample[][]=variants.map(()=>[]);
    for(let side=0;side<4;side++)for(let index=0;index<config.trials;index++) {
      const result=runEconomyPlayer(side===0?models[0]!:models[1]!,settings,config,policy,index,side===0?NO_RESPONSE:variants[side-1]!.response,index===0&&(side===0||side===2)?100:0);
      report.reconciledPlayers+=Number(result.reconciled);
      const sample:Sample={windows:new Map(result.days.filter(d=>windows.includes(d.day)).map(d=>[d.day,d])),active:new Set(result.days.filter(d=>d.active).map(d=>d.day)),firstUsefulDay:result.firstUsefulDay};
      (side===0?baseline:candidates[side-1]!).push(sample);
      if(index===0&&(side===0||side===2))report.traces.push({policyId:policy.id,side:side===0?'baseline':'candidate',trialIndex:0,result});
      if((index+1)%10===0 || index===config.trials-1) {progress(Math.min(10,(index%10)+1));await new Promise<void>(resolve=>setTimeout(resolve,0));}
    }
    const group:EconomyReport['groups'][number]={policy:structuredClone(policy),seed:cohortSeed(settings.seed,'economy-'+policy.id),share,windows:[]};
    for(let variant=0;variant<variants.length;variant++)for(let w=0;w<windows.length;w++) {
      const day=windows[w]!;if(day>config.days){if(variant===1)group.windows.push({day,mature:false,baseline:null,candidate:null,contributionInterval:null});continue;}
      const first=summarize(baseline,day),next=summarize(candidates[variant]!,day),target=weighted[variant]![w]!;
      addWeighted(target.baseline!,first,share);addWeighted(target.candidate!,next,share);
      const diff=candidates[variant]!.map((row,i)=>row.windows.get(day)!.contributionMinor-baseline[i]!.windows.get(day)!.contributionMinor),error=meanError(diff);
      variances[variant]![w]!+=share*share*error.variance/config.trials;
      if(variant===1)group.windows.push({day,mature:true,baseline:first,candidate:next,contributionInterval:config.trials>=30&&error.se&&error.se>0?{estimate:error.mean,low:error.mean-1.95996398454*error.se,high:error.mean+1.95996398454*error.se,method:'Paired large-sample normal'}:null});
    }
    report.groups.push(group);
  }
  for(let v=0;v<variants.length;v++) {
    for(let w=0;w<windows.length;w++) {
      const window=weighted[v]![w]!,se=Math.sqrt(variances[v]![w]!);
      if(window.mature&&config.trials>=30&&se>0){const estimate=window.candidate!.contributionMinor-window.baseline!.contributionMinor;window.contributionInterval={estimate,low:estimate-1.95996398454*se,high:estimate+1.95996398454*se,standardError:se,method:'Stratified paired large-sample normal'};}
    }
    const final=weighted[v]!.find(w=>w.day===config.days)!;
    report.scenarios.push({id:variants[v]!.id,name:variants[v]!.name,windows:weighted[v]!,requiredPopulationMultiplier:final.candidate!.contributionMinor>0 && final.baseline!.contributionMinor>0?final.baseline!.contributionMinor/final.candidate!.contributionMinor:null});
  }
  return report;
}
