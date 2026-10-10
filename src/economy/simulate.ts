import { createTrialRng, eventRng } from '../engine/rng.ts';
import { cohortSeed } from '../engine/analysis.ts';
import { stateFromInitial } from '../engine/initial.ts';
import { goalMet } from '../engine/simulate.ts';
import { pull, executePack, sparkIfReady } from '../engine/pull.ts';
import { craftIfReady } from '../engine/rewards.ts';
import { transitionState } from '../engine/lifecycle.ts';
import type { Banner, PullState } from '../engine/types.ts';
import type { RunSettings } from '../project/project.ts';
import { calendarOrder, resourceUnits } from './config.ts';
import { ResourceLedger, contribution, debit } from './ledger.ts';
import { RESOURCE_SCALE, type EconomyConfig, type PlayerPolicy, type PlayerResult, type Response, type Wallet, type LedgerEvent } from './types.ts';

export const NO_RESPONSE: Response = { attendanceMultiplier:1, purchaseMultiplier:1, costMultiplier:1, cannibalizationBps:0 };
export function civilDate(start: string, day: number): string {
  const date=new Date(start+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+day-1); return date.toISOString().slice(0,10);
}
export function utilityValue(config: EconomyConfig, inventory: Record<string,number>): { value: number; coverage: number } {
  let value=0; const tags=new Set<string>();
  for(const rule of config.utility.rules) {
    const copies=inventory[rule.itemId]??0;
    for(let i=0;i<Math.min(copies,rule.copyValues.length);i++)value+=rule.copyValues[i]!;
    if(copies>0 && rule.copyValues.some(v=>v>0))tags.add(rule.tag);
  }
  const totalTags=new Set(config.utility.rules.filter(r=>r.copyValues.some(v=>v>0)).map(r=>r.tag)).size;
  return {value:value+tags.size*config.utility.rosterBonus,coverage:totalTags?tags.size/totalTags:0};
}
export function runEconomyPlayer(starting: Banner, settings: RunSettings, config: EconomyConfig, policy: PlayerPolicy, index: number, response=NO_RESPONSE, retain=0): PlayerResult {
  const rng=createTrialRng(cohortSeed(settings.seed, 'economy-'+policy.id),index);
  let model=starting, state=stateFromInitial(model,settings.targetId,settings.initialState??policy.initialState);
  const ledger=new ResourceLedger(policy.wallet,state.inventory,resourceUnits(state.salvage),retain);
  const opening=ledger.view(), initialUtility=utilityValue(config,state.inventory).value;
  let firstGoalDay: number|null=goalMet(model,state,settings.goal)?0:null, firstUsefulDay: number|null=null;
  let activeDays=0,purchases=0,sequence=0;
  const offerCounts=new Map<string,number>();
  const subscriptions: {id:string;end:number;daily:number}[]=[];
  const refunds: {id:string;day:number;amount:number;tax:number;settled:boolean}[]=[];
  const cost=(n:number)=>Math.round(n*response.costMultiplier);
  const emit=(day:number,kind:string,effects:Omit<LedgerEvent,'id'|'day'|'kind'>={})=>ledger.apply({id:`${day}:${++sequence}`,day,kind,...effects});
  const free=(day:number,kind:string,wallet:Partial<Wallet>)=>emit(day,kind,{wallet,cash:{promotion:cost(Math.round((wallet.promotional??0)/RESOURCE_SCALE*config.finance.promotionalUnitCostMinor))}});
  const observe=(day:number)=>{
    if(firstGoalDay===null && goalMet(model,state,settings.goal))firstGoalDay=day;
    if(firstUsefulDay===null && utilityValue(config,state.inventory).value>initialUtility)firstUsefulDay=day;
  };
  const stateEvent=(day:number,kind:string,next:PullState,spend?:Partial<Wallet>)=>{
    const inventory: Record<string,number>=Object.fromEntries([...new Set([...Object.keys(state.inventory),...Object.keys(next.inventory)])].map(id=>[id,(next.inventory[id]??0)-(state.inventory[id]??0)] as const).filter(([,v])=>v!==0));
    const accepted=Object.values(inventory).reduce((n,v)=>n+Math.max(0,v),0);
    emit(day,kind,{wallet:spend,inventory,shards:resourceUnits(next.salvage)-resourceUnits(state.salvage),cash:{fulfilment:cost(accepted*config.finance.fulfilmentPerCopyMinor)}});
    state=next; observe(day);
  };
  const settle=(day:number)=>{
    // Bound automatic conversions explicitly; imported progress must never truncate silently.
    for(let n=0;n<100 && !goalMet(model,state,settings.goal);n++) {
      const next=structuredClone(state);
      const outcome=settings.sparkPolicy==='if-needed' && !['collection','budget'].includes(settings.goal.type) ? sparkIfReady(model,next,settings.exchangeItemId) : null;
      if(!outcome)break; stateEvent(day,'exchange',next);
    }
    if(!goalMet(model,state,settings.goal) && settings.sparkPolicy==='if-needed' && !['collection','budget'].includes(settings.goal.type) && sparkIfReady(model,structuredClone(state),settings.exchangeItemId)) throw new Error('economy: More than 100 automatic exchanges in one action. Reduce initial exchange progress or the acquisition goal.');
    if(settings.craftPolicy==='missing-targets' && model.duplicates?.craftCost) {
      const targets=settings.goal.type==='targets'?settings.goal.targets:settings.targetId?[{itemId:settings.targetId,count:settings.goal.type==='copies'?settings.goal.count:1}]:[];
      let count=0;
      for(const target of targets) while((state.inventory[target.itemId]??0)<target.count && count++<100) {
        const next=structuredClone(state); if(!craftIfReady(model,next,target.itemId))break; stateEvent(day,'craft',next);
      }
      if(count>=100 && targets.some(t=>(state.inventory[t.itemId]??0)<t.count && craftIfReady(model,structuredClone(state),t.itemId))) throw new Error('economy: More than 100 automatic crafts in one action. Reduce initial shards or the acquisition goal.');
    }
  };
  const settleRefunds=(day:number)=>{ for(const r of refunds)if(!r.settled&&r.day<=day){emit(day,'cash-refund',{cash:{refunds:r.amount,tax:-r.tax}});r.settled=true;} };
  const calendar=[...config.calendar].sort(calendarOrder);
  const days:PlayerResult['days']=[];
  for(let day=1;day<=config.days;day++) {
    settleRefunds(day);
    for(const e of calendar.filter(e=>e.day===day)) {
      if(e.type==='grant')free(day,'calendar-grant',{[e.origin]:e.amount});
      else if(e.type==='expire-promotional')emit(day,'promotional-expiry',{wallet:{promotional:-ledger.view().wallet.promotional}});
      else {
        const nextModel=e.type==='banner-switch'?e.model:model;
        const next=transitionState(model,nextModel,state,e);
        emit(day,e.type); state=next; model=nextModel; observe(day);
      }
    }
    const active=eventRng(rng,`economy:day:${day}:attendance`)()<Math.min(1,policy.attendance*response.attendanceMultiplier);
    const grossBefore=ledger.view().cash.payments;
    if(active) {
      activeDays++;
      emit(day,'session',{cash:{service:cost(config.finance.activeDayCostMinor),otherProduct:config.finance.otherProductPerActiveDayMinor,cannibalization:Math.round(config.finance.otherProductPerActiveDayMinor*response.cannibalizationBps/10000)}});
      free(day,'session-grant',{earned:config.dailyEarned,promotional:config.dailyPromotional});
      for(const sub of subscriptions)if(day<=sub.end)free(day,'subscription-instalment',{promotional:sub.daily});
      if(day>=config.availableFromDay && day<=config.availableThroughDay) {
        settle(day); observe(day);
        const actions=Math.min(policy.actionsPerSession,Math.floor(policy.sessionMinutes/policy.minutesPerAction));
        const willing=eventRng(rng,`economy:day:${day}:purchase`)()<Math.min(1,policy.purchaseChance*response.purchaseMultiplier);
        for(let action=0;action<actions;action++) {
          if((policy.kind==='goal'||policy.stopOnGoal) && goalMet(model,state,settings.goal))break;
          if(policy.kind==='saver' && day<policy.savingUntilDay)break;
          const size=settings.actionMode==='pack'?model.multiPull!.size:1;
          if(state.totalPulls+size>settings.maxPulls || (settings.goal.type==='budget'&&state.totalPulls+size>settings.goal.pulls))break;
          const price=resourceUnits(model.pullCost.amount)*size;
          let payment=debit(ledger.view().wallet,price);
          if(!payment && policy.kind!=='free' && willing) {
            const offer=config.offers.find(o=>o.id===policy.offerId)!;
            const count=offerCounts.get(offer.id)??0;
            if(day<offer.startDay||day>offer.endDay||count>=offer.limit|| (offer.kind==='subscription'&&subscriptions.some(s=>s.id===offer.id&&s.end>=day)))break;
            const shortfall=price-Object.values(ledger.view().wallet).reduce((n,v)=>n+v,0);
            const quantity=offer.kind==='bundle'?Math.ceil(shortfall/(offer.paid+offer.promotional)):1;
            if(count+quantity>offer.limit)break;
            const gross=offer.kind==='exact'?Math.ceil(shortfall*offer.priceMinor/RESOURCE_SCALE):offer.priceMinor*quantity;
            const wallet:Partial<Wallet>=offer.kind==='exact'?{paid:shortfall}:{paid:offer.paid*quantity,promotional:offer.promotional*quantity+(offer.kind==='subscription'?offer.dailyPromotional:0)};
            if(!debit({...ledger.view().wallet,paid:ledger.view().wallet.paid+(wallet.paid??0),promotional:ledger.view().wallet.promotional+(wallet.promotional??0)},price))break;
            const cash=ledger.view().cash;
            if(cash.payments+gross>policy.totalBudgetMinor || cash.payments-grossBefore+gross>policy.dailyBudgetMinor)break;
            const tax=Math.round(gross*config.finance.inclusiveTaxBps/(10000+config.finance.inclusiveTaxBps));
            emit(day,'cash-purchase',{wallet,cash:{payments:gross,tax,fees:Math.round(gross*config.finance.feeBps/10000)+config.finance.fixedFeeMinor,promotion:cost(Math.round((wallet.promotional??0)/RESOURCE_SCALE*config.finance.promotionalUnitCostMinor))}});
            offerCounts.set(offer.id,count+quantity); purchases++;
            if(offer.kind==='subscription')subscriptions.push({id:offer.id,end:day+offer.subscriptionDays-1,daily:offer.dailyPromotional});
            const refund=Math.round(gross*config.finance.refundBps/10000);
            refunds.push({id:`refund:${day}:${sequence}`,day:day+config.finance.refundDelayDays,amount:refund,tax:Math.round(tax*config.finance.refundBps/10000),settled:false});
            payment=debit(ledger.view().wallet,price);
          }
          if(!payment)break;
          const next=structuredClone(state);
          if(settings.actionMode==='pack')executePack(model,next,rng); else pull(model,next,rng);
          stateEvent(day,'draw-purchase',next,payment);
          settle(day);
        }
      }
    }
    settleRefunds(day);
    const closing=ledger.view(),utility=utilityValue(config,state.inventory);
    days.push({day,date:civilDate(config.startDate,day),active,activeDays,purchases,pulls:state.totalPulls,complete:firstGoalDay!==null,utility:utility.value-initialUtility,rosterCoverage:utility.coverage,wallet:closing.wallet,cash:closing.cash,contributionMinor:contribution(closing.cash),pendingRefundMinor:refunds.filter(r=>!r.settled).reduce((n,r)=>n+r.amount,0)});
  }
  const closing=ledger.view();
  const reconciled=ledger.reconcile() && JSON.stringify(Object.entries(closing.inventory).sort())===JSON.stringify(Object.entries(state.inventory).sort()) && closing.shards===resourceUnits(state.salvage);
  if(!reconciled)throw new Error('economy.reconciliation: Resource, inventory or shard conservation failed.');
  return {days,firstGoalDay,firstUsefulDay,opening,movements:ledger.movements(),closing,events:ledger.events,eventCount:ledger.eventCount,truncated:ledger.eventCount>ledger.events.length,reconciled,
    protection:{counters:state.counters,featuredArmed:state.featuredArmed,sinceFeatured:state.sinceFeatured,sparkProgress:state.sparkProgress,targetProgress:state.targetProgress,onceGuaranteeUsed:state.onceGuaranteeUsed,inventory:state.inventory,salvage:state.salvage},scopedProgress:state.scoped};
}
