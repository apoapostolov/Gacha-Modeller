import { contentHash } from '../project/project.ts';
import { assertSpecialist, type SpecialistProfile } from './types.ts';
import { collectibleReport } from './collectible.ts';
import { payoutSimulation } from './payout.ts';
import { meanDifference } from '../engine/uncertainty.ts';
export const SPECIALIST_ENGINE = 'specialist-7.1';
export const SPECIALIST_RANDOM_POLICY = 'mulberry32-session-streams-v1';
export function analyzeSpecialist(profile:SpecialistProfile) {
  assertSpecialist(profile);
  if(profile.kind==='collectible')return {kind:profile.kind,baseline:collectibleReport(profile.baseline),candidate:collectibleReport(profile.candidate)};
  const baseline=payoutSimulation(profile.baseline,profile.run),candidate=payoutSimulation(profile.candidate,profile.run);
  return {kind:profile.kind,baseline,candidate,contributionDifference:meanDifference(baseline.portfolioContributionsMinor,candidate.portfolioContributionsMinor,true)};
}
export async function reviewScopeHash(profile:SpecialistProfile) {
  return contentHash({engineVersion:SPECIALIST_ENGINE,randomPolicy:SPECIALIST_RANDOM_POLICY,kind:profile.kind,provenance:profile.provenance,baseline:profile.baseline,candidate:profile.candidate,run:profile.run,jurisdiction:profile.review.jurisdiction,changeId:profile.review.changeId,classification:profile.review.classification});
}
export async function specialistExport(profile:SpecialistProfile) {
  assertSpecialist(profile);const scopeHash=await reviewScopeHash(profile);
  const reviews=profile.review.records.map(r=>({...r,current:r.status==='reviewed'&&r.scopeHash===scopeHash&&!!r.reviewer.trim()&&!!r.reference.trim()}));
  return {format:'reward-specialist-report',version:1,engineVersion:SPECIALIST_ENGINE,randomPolicy:SPECIALIST_RANDOM_POLICY,scopeHash,
    baselineHash:await contentHash(profile.baseline),candidateHash:await contentHash(profile.candidate),profile,report:analyzeSpecialist(profile),reviews,
    releaseStatus:'research-only',reviewComplete:reviews.every(r=>r.current)&&!!profile.review.owner.trim()&&profile.review.jurisdiction!=='Unspecified',
    limitations:['Synthetic assumptions; no production approval or authenticated signatures.','Local review records are editable; hashes detect changed scope, not reviewer authority.','Independent static payout sessions settle sequentially; pending withdrawals, correlations, taxes and jackpots are excluded. Research RNG is not operational randomness.','Collectible price/liquidity scenarios are assumptions, not forecasts or cash-equivalent item values.']};
}
