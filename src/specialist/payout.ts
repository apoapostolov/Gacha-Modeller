import { mulberry32 } from '../engine/rng.ts';
import { wilson } from '../engine/uncertainty.ts';
import { assertPayout, assertSpecialistRun, type PayoutConfig, type SpecialistProfile } from './types.ts';
export function payoutMath(config: PayoutConfig) {
  assertPayout(config);
  const totalWeight = config.outcomes.reduce((a,r)=>a+r.weight,0);
  const probabilities = config.outcomes.map(r=>({...r, probability:r.weight/totalWeight}));
  const meanPayoutMinor = probabilities.reduce((a,r)=>a+r.probability*r.payoutMinor,0);
  const varianceMinor = probabilities.reduce((a,r)=>a+r.probability*(r.payoutMinor-meanPayoutMinor)**2,0);
  const feePerPlayMinor = Math.round(config.stakeMinor * config.feeRate);
  return { probabilities, meanPayoutMinor, rtp:meanPayoutMinor/config.stakeMinor, houseEdge:1-meanPayoutMinor/config.stakeMinor,
    sdStakeUnits:Math.sqrt(varianceMinor)/config.stakeMinor, positivePayoutProbability:probabilities.filter(r=>r.payoutMinor>0).reduce((a,r)=>a+r.probability,0),
    profitablePlayProbability:probabilities.filter(r=>r.payoutMinor>config.stakeMinor).reduce((a,r)=>a+r.probability,0),
    feePerPlayMinor, contributionPerPlayMinor:config.stakeMinor-meanPayoutMinor-feePerPlayMinor-config.operatingCostMinor,
    worstPayoutMinor:Math.max(...probabilities.map(r=>r.payoutMinor)) };
}
/** Each trial settles a fixed portfolio of independent player sessions against a shared treasury. */
export function payoutSimulation(config: PayoutConfig, run: SpecialistProfile['run']) {
  assertSpecialistRun(run);
  const math=payoutMath(config), ending:number[]=[], minTreasury:number[]=[], playerNet:number[]=[],sessionsPerTrial=run.sessionsPerTrial??1;
  let stakesMinor=0,payoutsMinor=0,feesMinor=0,operatingCostsMinor=0,plays=0,depleted=0,lossStopped=0;
  const checkpoints=[...new Set([1,Math.min(10,run.rounds),run.rounds])];
  const horizonCounts=checkpoints.map(rounds=>({rounds,anyPositivePayout:0,anyProfitablePlay:0,netProfit:0}));
  for(let trial=0;trial<run.trials;trial++) {
    let treasury=config.treasuryMinor,minimum=treasury;
    for(let session=0;session<sessionsPerTrial;session++) {
    const rng=mulberry32((run.seed ^ Math.imul(trial*sessionsPerTrial+session+1,0x9e3779b1))>>>0);
    let wallet=config.playerWalletMinor,positive=false,profitable=false,completed=0;
    for(let round=1;round<=run.rounds;round++) {
      if(wallet<config.stakeMinor || config.playerWalletMinor-wallet>=config.netLossLimitMinor) break;
      const u=rng();let acc=0, outcome=math.probabilities.at(-1)!;
      for(const row of math.probabilities){acc+=row.probability;if(u<acc){outcome=row;break;}}
      wallet+=outcome.payoutMinor-config.stakeMinor;
      treasury+=config.stakeMinor-outcome.payoutMinor-math.feePerPlayMinor-config.operatingCostMinor;
      minimum=Math.min(minimum,treasury);positive ||= outcome.payoutMinor>0;profitable ||= outcome.payoutMinor>config.stakeMinor;completed=round;
      stakesMinor+=config.stakeMinor;payoutsMinor+=outcome.payoutMinor;feesMinor+=math.feePerPlayMinor;operatingCostsMinor+=config.operatingCostMinor;plays++;
      const checkpoint=horizonCounts.find(r=>r.rounds===round);
      if(checkpoint){checkpoint.anyPositivePayout+=Number(positive);checkpoint.anyProfitablePlay+=Number(profitable);checkpoint.netProfit+=Number(wallet>config.playerWalletMinor);}
    }
    // Early stops remain in the original eligible denominator with their settled state.
    for(const checkpoint of horizonCounts.filter(r=>r.rounds>completed)){checkpoint.anyPositivePayout+=Number(positive);checkpoint.anyProfitablePlay+=Number(profitable);checkpoint.netProfit+=Number(wallet>config.playerWalletMinor);}
    depleted+=Number(wallet<config.stakeMinor);lossStopped+=Number(config.playerWalletMinor-wallet>=config.netLossLimitMinor);
    playerNet.push(wallet-config.playerWalletMinor);
    }
    ending.push(treasury);minTreasury.push(minimum);
  }
  const sorted=ending.slice().sort((a,b)=>a-b), mean=ending.reduce((a,b)=>a+b,0)/run.trials;
  const variance=ending.reduce((a,b)=>a+(b-mean)**2,0)/(run.trials-1);
  const q=(p:number)=>sorted[Math.max(0,Math.ceil(p*sorted.length)-1)]!;
  const eligibleSessions=run.trials*sessionsPerTrial;
  return { math, plays,eligibleSessions,sessionsPerTrial,meanPlays:plays/eligibleSessions,stakesMinor,payoutsMinor,feesMinor,operatingCostsMinor,
    actualRtp:stakesMinor?payoutsMinor/stakesMinor:null,meanContributionMinor:mean-config.treasuryMinor,
    meanIntervalMinor:run.trials < 30 || variance === 0 ? null : [mean-config.treasuryMinor-1.96*Math.sqrt(variance/run.trials),mean-config.treasuryMinor+1.96*Math.sqrt(variance/run.trials)],
    endingTreasuryP01Minor:q(.01),endingTreasuryP50Minor:q(.5),endingTreasuryP99Minor:q(.99),
    treasuryDeficitProbability:minTreasury.filter(v=>v<0).length/run.trials,maxDeficitMinor:Math.max(0,-Math.min(...minTreasury)),
    treasuryDeficitInterval:wilson(minTreasury.filter(v=>v<0).length,run.trials),
    portfolioContributionsMinor:ending.map(v=>v-config.treasuryMinor),
    meanContributionPerPlayerMinor:(mean-config.treasuryMinor)/sessionsPerTrial,
    depletedProbability:depleted/eligibleSessions,lossStoppedProbability:lossStopped/eligibleSessions,
    reconciliationError:ending.reduce((a,b)=>a+b,0)-run.trials*config.treasuryMinor-(stakesMinor-payoutsMinor-feesMinor-operatingCostsMinor),
    horizons:horizonCounts.map(r=>({rounds:r.rounds,anyPositivePayout:r.anyPositivePayout/eligibleSessions,anyProfitablePlay:r.anyProfitablePlay/eligibleSessions,netProfit:r.netProfit/eligibleSessions})),
    playerNetMeanMinor:playerNet.reduce((a,b)=>a+b,0)/eligibleSessions };
}
