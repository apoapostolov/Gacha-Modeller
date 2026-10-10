import { useEffect, useId, useRef, useState } from 'react';
import type { Banner } from '../engine/types.ts';
import type { RunSettings } from '../project/project.ts';
import { defaultEconomy, validateEconomy } from '../economy/config.ts';
import { RESOURCE_SCALE, type EconomyConfig, type Finance, type PlayerPolicy, type Response, type Offer } from '../economy/types.ts';
import { Help } from './Help.tsx';
import { EconomyCalendar } from './EconomyCalendar.tsx';

const policyNames={free:'Non-paying',budget:'Budget-limited',goal:'Goal-oriented',saver:'Saving'};

function NumberInput({label,value,onChange,max=1000000000,min=0,step=1,hint}: {label:string;value:number;onChange:(value:number)=>void;max?:number;min?:number;step?:number;hint?:string}) {
  const id=useId();return <div className="field"><label htmlFor={id}>{label}</label><input id={id} type="number" value={Number.isNaN(value)?'':value} min={min} max={max} step={step} aria-describedby={hint?id+'-hint':undefined} onChange={e=>onChange(e.target.valueAsNumber)}/>{hint&&<p className="field-hint" id={id+'-hint'}>{hint}</p>}</div>;
}
export function EconomySettings({value,onChange,models}:{value:RunSettings;onChange:(next:RunSettings)=>void;models:Banner[]}) {
  const config=value.economy;
  const [json,setJson]=useState(config?JSON.stringify(config,null,2):'');
  const [jsonError,setJsonError]=useState<string|null>(null);
  const errorRef=useRef<HTMLParagraphElement>(null),jsonId=useId();
  useEffect(()=>setJson(config?JSON.stringify(config,null,2):''),[config]);
  useEffect(()=>{if(jsonError)errorRef.current?.focus();},[jsonError]);
  const conflict=!!(value.transitions?.length || value.analysis?.cohorts?.length || value.analysis?.experiment);
  const change=(patch:Partial<EconomyConfig>)=>onChange({...value,economy:{...config!,...patch}});
  const finance=(key:keyof Finance,n:number)=>change({finance:{...config!.finance,[key]:n}});
  const policy=(index:number,patch:Partial<PlayerPolicy>)=>change({policies:config!.policies.map((p,i)=>i===index?{...p,...patch}:p)});
  const offer=(index:number,patch:Partial<Offer>)=>change({offers:config!.offers.map((p,i)=>i===index?{...p,...patch}:p)});
  const response=(side:'response'|'adverse',key:keyof Response,n:number)=>change({[side]:{...config![side],[key]:n}});
  let issue:string|null=null;
  if(config)try{validateEconomy(config,value,models);}catch(e){issue=e instanceof Error?e.message:'Invalid economy scenario.';}
  return <details className="editor-section economy-settings"><summary>Economy and calendar scenarios{config?' · enabled':''}</summary>
    <p className="run-note">Calendar scenarios connect rewards to wallets, cash payments and assumed player activity. The mechanical comparison remains a separate reference. <Help label="Economy scenario scope">The same policies, initial states, offers and calendar apply on both sides. Candidate response assumptions are separate sensitivity inputs. Resources use thousandths; cash uses hundredths of the configured unit. No real transactions occur.</Help></p>
    <label className="check-field"><input type="checkbox" checked={!!config} disabled={!config&&conflict} onChange={e=>onChange({...value,economy:e.target.checked?defaultEconomy(models):undefined})}/>Include economy scenarios</label>
    {conflict&&<p className="field-hint">Economy scenarios require day-based scheduling. Pull-based transitions and mechanical population/parameter experiments must be disabled first.</p>}
    {config&&<>
      <p className="evidence-note">Synthetic assumptions · company finance approval pending</p>
      {issue&&<p className="field-hint validation-hint">Configuration requires correction: {issue}</p>}
      <fieldset className="analysis-group"><legend>Calendar and population</legend><p className="field-hint">A day is a local calendar date in the selected time zone. Return rates are generated from attendance assumptions.</p><div className="editor-grid">
        <label className="field">Scenario name<input value={config.name} onChange={e=>change({name:e.target.value})}/></label>
        <label className="field">Cash currency<input value={config.cashCurrency} maxLength={3} onChange={e=>change({cashCurrency:e.target.value.toUpperCase()})}/></label>
        <label className="field">Starting local date<input type="date" value={config.startDate} onChange={e=>change({startDate:e.target.value})}/></label>
        <label className="field">Calendar time zone<input value={config.timeZone} onChange={e=>change({timeZone:e.target.value})}/></label>
        <NumberInput label="Scenario duration (days)" value={config.days} min={1} max={180} onChange={days=>change({days,availableThroughDay:Math.min(config.availableThroughDay,days),availableFromDay:Math.min(config.availableFromDay,days),offers:config.offers.map(o=>({...o,startDay:Math.min(o.startDay,days),endDay:Math.min(o.endDay,days)})),policies:config.policies.map(p=>({...p,savingUntilDay:Math.min(p.savingUntilDay,days)}))})}/>
        <NumberInput label="Players per policy" value={config.trials} min={1} max={1000} onChange={trials=>change({trials})} hint="Every policy receives this sample size; shares determine the population weighting."/>
        <NumberInput label="Draw availability begins (day)" value={config.availableFromDay} min={1} max={config.days} onChange={availableFromDay=>change({availableFromDay})}/>
        <NumberInput label="Draw availability ends (day)" value={config.availableThroughDay} min={1} max={config.days} onChange={availableThroughDay=>change({availableThroughDay})}/>
        <NumberInput label="Earned grant per active day" value={config.dailyEarned/RESOURCE_SCALE} step={.001} onChange={n=>change({dailyEarned:Math.round(n*RESOURCE_SCALE)})}/>
        <NumberInput label="Promotional grant per active day" value={config.dailyPromotional/RESOURCE_SCALE} step={.001} onChange={n=>change({dailyPromotional:Math.round(n*RESOURCE_SCALE)})}/>
      </div></fieldset>
      <details className="editor-group"><summary>Cash contribution assumptions</summary><p className="field-hint">Amounts are in {config.cashCurrency}. Cash contribution deducts the listed variable costs from net cash receipts; unspent balances are reported separately. <Help label="Cash contribution convention">This calculation does not recognize statutory revenue or allocate fixed costs. Tax is included in the gross payment; refunded tax reverses proportionally. Payment fees and virtual credits are retained after refund. Gross purchase budgets do not replenish after refunds.</Help></p><div className="editor-grid">
        {([['feeBps','Payment fee (%)'],['inclusiveTaxBps','Tax included in price (%)'],['refundBps','Refunded payment share (%)']] as const).map(([key,label])=><NumberInput key={key} label={label} value={config.finance[key]/100} max={100} step={.01} onChange={n=>finance(key,Math.round(n*100))}/>)}
        {([['fixedFeeMinor','Fixed fee per payment'],['fulfilmentPerCopyMinor','Fulfilment per retained copy'],['activeDayCostMinor','Service cost per active day'],['promotionalUnitCostMinor','Cost per promotional resource unit'],['otherProductPerActiveDayMinor','Other-product contribution per active day']] as const).map(([key,label])=><NumberInput key={key} label={label} value={config.finance[key]/100} step={.01} onChange={n=>finance(key,Math.round(n*100))}/>)}
        <NumberInput label="Refund delay (days)" value={config.finance.refundDelayDays} max={180} onChange={n=>finance('refundDelayDays',n)}/>
      </div><label className="field">Finance assumptions<textarea value={config.finance.convention} maxLength={500} rows={4} onChange={e=>change({finance:{...config.finance,convention:e.target.value}})}/></label></details>
      <details className="editor-group"><summary>Currency offers ({config.offers.length})</summary><p className="field-hint">Bundles credit resources immediately. Exact top-ups fund only the shortfall. Subscriptions add attendance-based instalments during their term.</p>
        {config.offers.map((o,i)=><fieldset className="analysis-group" key={o.id}><legend>Offer {i+1}: {o.name}</legend><div className="editor-grid">
          <label className="field">Offer name<input value={o.name} onChange={e=>offer(i,{name:e.target.value})}/></label>
          <label className="field">Offer type<select value={o.kind} onChange={e=>offer(i,{kind:e.target.value as Offer['kind'],...(e.target.value==='exact'?{paid:0,promotional:0,dailyPromotional:0}:e.target.value==='bundle'?{dailyPromotional:0,paid:o.paid||1000}:{paid:o.paid||1000})})}><option value="bundle">Fixed currency bundle</option><option value="exact">Exact-shortfall top-up</option><option value="subscription">Attendance subscription</option></select></label>
          <NumberInput label={o.kind==='exact'?'Cash price per resource unit':'Cash price per bundle'} value={o.priceMinor/100} min={.01} step={.01} onChange={n=>offer(i,{priceMinor:Math.round(n*100)})}/>
          {o.kind!=='exact'&&<><NumberInput label="Paid currency credit" value={o.paid/1000} step={.001} onChange={n=>offer(i,{paid:Math.round(n*1000)})}/><NumberInput label="Promotional currency credit" value={o.promotional/1000} step={.001} onChange={n=>offer(i,{promotional:Math.round(n*1000)})}/></>}
          <NumberInput label="Opening day" value={o.startDay} min={1} max={config.days} onChange={startDay=>offer(i,{startDay})}/><NumberInput label="Closing day" value={o.endDay} min={1} max={config.days} onChange={endDay=>offer(i,{endDay})}/><NumberInput label="Purchase quantity limit" value={o.limit} min={1} max={1000} onChange={limit=>offer(i,{limit})}/>
          {o.kind==='subscription'&&<><NumberInput label="Subscription term (days)" value={o.subscriptionDays} min={1} max={180} onChange={subscriptionDays=>offer(i,{subscriptionDays})}/><NumberInput label="Daily subscription credit" value={o.dailyPromotional/1000} step={.001} onChange={n=>offer(i,{dailyPromotional:Math.round(n*1000)})}/></>}
        </div>{config.offers.length>1&&<button className="text-button" onClick={()=>change({offers:config.offers.filter((_,j)=>j!==i)})}>Remove offer {i+1}</button>}</fieldset>)}
        {config.offers.length<8&&<button className="text-button" onClick={()=>{let n=1;while(config.offers.some(o=>o.id===`offer-${n}`))n++;change({offers:[...config.offers,{...config.offers[0]!,id:`offer-${n}`,name:`Currency offer ${n}`}]});}}>Add offer</button>}
      </details>
      <details className="editor-group"><summary>Player policy assumptions ({config.policies.length})</summary><p className="field-hint">Policies specify attendance, saving, payment limits and session time. Hard affordability and time limits take precedence over purchase willingness. Starting balances use {models[0]!.pullCost.currency}; cash budgets use {config.cashCurrency}.</p>
        {config.policies.map((p,i)=><details className="analysis-group" key={p.id}><summary>{p.name} · {policyNames[p.kind]}</summary><div className="editor-grid">
          <label className="field">Policy name<input value={p.name} onChange={e=>policy(i,{name:e.target.value})}/></label>
          <label className="field">Policy family<select value={p.kind} onChange={e=>policy(i,{kind:e.target.value as PlayerPolicy['kind']})}><option value="free">Non-paying</option><option value="budget">Budget-limited</option><option value="goal">Goal-oriented</option><option value="saver">Saving until a specified day</option></select></label>
          <NumberInput label="Population share weight" value={p.weight} min={.000001} step={.1} onChange={weight=>policy(i,{weight})}/>
          <NumberInput label="Daily attendance probability (%)" value={p.attendance*100} max={100} step={.1} onChange={n=>policy(i,{attendance:n/100})}/>
          <NumberInput label="Daily top-up willingness (%)" value={p.purchaseChance*100} max={100} step={.1} onChange={n=>policy(i,{purchaseChance:n/100})}/>
          <NumberInput label="Maximum actions per session" value={p.actionsPerSession} max={50} onChange={actionsPerSession=>policy(i,{actionsPerSession})}/>
          <NumberInput label="Available minutes per session" value={p.sessionMinutes} min={1} max={240} onChange={sessionMinutes=>policy(i,{sessionMinutes})}/>
          <NumberInput label="Minutes per draw action" value={p.minutesPerAction} min={1} max={240} onChange={minutesPerAction=>policy(i,{minutesPerAction})}/>
          <NumberInput label="Daily cash budget" value={p.dailyBudgetMinor/100} step={.01} onChange={n=>policy(i,{dailyBudgetMinor:Math.round(n*100)})}/><NumberInput label="Total cash budget" value={p.totalBudgetMinor/100} step={.01} onChange={n=>policy(i,{totalBudgetMinor:Math.round(n*100)})}/>
          {p.kind==='saver'&&<NumberInput label="Saving ends (day)" value={p.savingUntilDay} min={1} max={config.days} onChange={savingUntilDay=>policy(i,{savingUntilDay})}/>}
          <label className="field">Preferred offer<select value={p.offerId} onChange={e=>policy(i,{offerId:e.target.value})}>{config.offers.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
          {(['paid','earned','promotional'] as const).map(k=><NumberInput key={k} label={`Starting ${k} balance`} value={p.wallet[k]/1000} step={.001} onChange={n=>policy(i,{wallet:{...p.wallet,[k]:Math.round(n*1000)}})}/>)}
        </div><label className="check-field"><input type="checkbox" checked={p.kind==='goal'||p.stopOnGoal} disabled={p.kind==='goal'} onChange={e=>policy(i,{stopOnGoal:e.target.checked})}/>Stop draw actions after goal completion</label><p className="field-hint">Attendance continues after completion. Starting inventory and acquisition protection are configurable in the full scenario configuration.</p>
        {config.policies.length>1&&<button className="text-button" onClick={()=>change({policies:config.policies.filter((_,j)=>j!==i)})}>Remove policy {i+1}</button>}</details>)}
        {config.policies.length<4&&<button className="text-button" onClick={()=>{let n=1;while(config.policies.some(p=>p.id===`policy-${n}`))n++;change({policies:[...config.policies,{...config.policies[0]!,id:`policy-${n}`,name:`Policy ${n}`}]});}}>Add player policy</button>}
      </details>
      <EconomyCalendar config={config} models={models} onChange={change}/>
      <details className="editor-group"><summary>Candidate response sensitivity</summary><p className="field-hint">The no-response reference remains unchanged. The following multipliers affect only the candidate scenario and are assumptions, not measured treatment effects.</p>{(['response','adverse'] as const).map(side=><fieldset className="analysis-group" key={side}><legend>{side==='response'?'Declared response':'Adverse response'}</legend><div className="editor-grid">
        {([['attendanceMultiplier','Attendance multiplier'],['purchaseMultiplier','Top-up willingness multiplier'],['costMultiplier','Variable cost multiplier']] as const).map(([key,label])=><NumberInput key={key} label={label} value={config[side][key]} max={3} step={.05} onChange={n=>response(side,key,n)}/>)}
        <NumberInput label="Other-product contribution displaced (%)" value={config[side].cannibalizationBps/100} max={100} step={.1} onChange={n=>response(side,'cannibalizationBps',Math.round(n*100))}/>
      </div></fieldset>)}</details>
      <details className="editor-group"><summary>Full scenario configuration</summary><p className="field-hint">The complete configuration also specifies scheduled grants, promotional expiry, season/banner migrations, initial protection and item utility curves. Validation precedes application.</p><label className="field" htmlFor={jsonId}>Scenario configuration (JSON)</label><textarea id={jsonId} className="config-json" spellCheck={false} rows={16} value={json} onChange={e=>{setJson(e.target.value);setJsonError(null);}}/>
        {jsonError&&<p role="alert" tabIndex={-1} ref={errorRef} className="run-error">{jsonError}</p>}
        <button className="secondary" onClick={()=>{try{const next:unknown=JSON.parse(json);validateEconomy(next,{...value,economy:undefined},models);change(next);setJsonError(null);}catch(e){setJsonError(e instanceof Error?e.message:'Invalid scenario configuration.');}}}>Apply scenario configuration</button>
      </details>
    </>}
  </details>;
}
