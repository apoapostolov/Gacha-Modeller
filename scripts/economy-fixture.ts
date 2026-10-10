import { readFile, writeFile } from 'node:fs/promises';
import { createProject, saveCandidate, withSettings, importProject } from '../src/project/project.ts';
import { defaultEconomy } from '../src/economy/config.ts';
import { compareProject } from '../src/jobs/compare.ts';
import type { Banner } from '../src/engine/types.ts';

// Reproducible synthetic acceptance fixture; no company approval or observed behaviour implied.
const model:Banner=JSON.parse(await readFile(new URL('../docs/fixtures/company-banner.json',import.meta.url),'utf8')).model;
model.name='Synthetic economy baseline';model.duplicates={cap:5,protection:'none',overflow:'salvage',salvagePerCopy:1,craftCost:100,craftableItems:['target']};
let project=await createProject(model);
const candidate=structuredClone(model);candidate.name='Synthetic economy candidate';candidate.blurb='A synthetic 1% chase banner with an 80-pull cap.';candidate.pity[0]!.hardAt=80;
project=await saveCandidate(project,candidate);
const economy=defaultEconomy([model,candidate]);economy.name='Synthetic two-season acceptance scenario';economy.trials=100;economy.timeZone='Europe/Kyiv';economy.dailyEarned=500;
economy.calendar=[{id:'mid-grant',day:30,type:'grant',origin:'promotional',amount:6000},{id:'expiry',day:46,type:'expire-promotional'},{id:'second-season',day:46,type:'season',seasonId:'second'}];
Object.assign(economy.finance,{inclusiveTaxBps:2000,fixedFeeMinor:10,fulfilmentPerCopyMinor:2,promotionalUnitCostMinor:1,otherProductPerActiveDayMinor:5});
economy.finance.convention='Synthetic cash contribution in USD. Prices include 20% tax; fees are 3% plus USD 0.10 per payment. Refunds retain fees and virtual credits. No fixed costs, recognized revenue or discounting.';
economy.offers.push({id:'exact',name:'Exact-shortfall credit',kind:'exact',priceMinor:100,paid:0,promotional:0,startDay:1,endDay:90,limit:100,subscriptionDays:30,dailyPromotional:0},{id:'subscription',name:'Attendance subscription',kind:'subscription',priceMinor:500,paid:2000,promotional:500,startDay:1,endDay:90,limit:3,subscriptionDays:30,dailyPromotional:500});
for(const p of economy.policies){p.wallet.earned=2000;p.savingUntilDay=15;}
economy.policies[0]!.weight=25;
Object.assign(economy.policies[1]!,{weight:40,totalBudgetMinor:6000,offerId:'exact'});
Object.assign(economy.policies[2]!,{weight:25,totalBudgetMinor:10000,dailyBudgetMinor:1000,offerId:'subscription'});
Object.assign(economy.policies[3]!,{weight:10,totalBudgetMinor:4000,dailyBudgetMinor:1000});
project=withSettings(project,{goal:{type:'first-featured'},targetId:'target',craftPolicy:'missing-targets',trials:300,seed:42,sparkPolicy:'never',maxPulls:200,actionMode:'single',economy});
// Stable fixture metadata; content hashes still verify actual immutable model snapshots.
project=structuredClone(project);project.id='synthetic-economy-pilot';project.name='Synthetic company economy';
for(const [i,snapshot] of [project.baseline,project.candidate,...project.history].entries()){snapshot.id=`synthetic-snapshot-${i}`;snapshot.createdAt='2026-10-10T00:00:00.000Z';}
await importProject(project);
await writeFile(new URL('../docs/fixtures/company-economy.json',import.meta.url),JSON.stringify(project,null,2)+'\n');
const report=await compareProject(project,project.settings);
const reference={fixture:'company-economy.json',engineVersion:report.engineVersion,metricVersion:report.economy!.metricVersion,seed:42,evidence:'synthetic',financeApproval:'pending',reconciledPlayers:report.economy!.reconciledPlayers,totalPlayers:report.economy!.totalPlayers,scenarios:report.economy!.scenarios,groups:report.economy!.groups,handCalculatedWaterfall:{description:'The separate two-day test fixture uses one USD 5 bundle and two retained copies.',grossPaymentMinor:500,refundMinor:100,netTaxMinor:66,feeMinor:25,serviceMinor:4,fulfilmentMinor:6,promotionMinor:2,contributionMinor:297,residualPaidResourceThousandths:4000}};
await writeFile(new URL('../docs/economy-reference.json',import.meta.url),JSON.stringify(reference,null,2)+'\n');
console.log(JSON.stringify({reconciled:reference.reconciledPlayers,total:reference.totalPlayers,final:reference.scenarios.map(s=>{const w=s.windows.find(w=>w.day===90)!;return {scenario:s.id,completionDifferencePP:100*(w.candidate!.completion-w.baseline!.completion),contributionDifferenceMinor:w.candidate!.contributionMinor-w.baseline!.contributionMinor,requiredPopulationMultiplier:s.requiredPopulationMultiplier};})},null,2));
