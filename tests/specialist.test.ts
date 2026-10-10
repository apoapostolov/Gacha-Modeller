import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { defaultSpecialist } from '../src/specialist/defaults.ts';
import { assertSpecialist } from '../src/specialist/types.ts';
import { payoutMath, payoutSimulation } from '../src/specialist/payout.ts';
import { collectibleReport } from '../src/specialist/collectible.ts';
import { reviewScopeHash, specialistExport } from '../src/specialist/report.ts';
import { importProject } from '../src/project/project.ts';
describe('specialist financial contracts',()=>{
  it('matches hand-calculated payout expectation, volatility and rounded contribution',()=>{
    const p=defaultSpecialist('payout');if(p.kind!=='payout')throw Error();
    const b=payoutMath(p.baseline),c=payoutMath(p.candidate);
    expect(b.rtp).toBeCloseTo(.9);expect(c.rtp).toBeCloseTo(.9);expect(b.houseEdge).toBeCloseTo(.1);
    expect(b.sdStakeUnits).toBeCloseTo(Math.sqrt(3.09));expect(c.sdStakeUnits).toBeCloseTo(Math.sqrt(2.09));
    expect(b.contributionPerPlayMinor).toBeCloseTo(7);expect(c.contributionPerPlayMinor).toBeCloseTo(7);
    expect(b.positivePayoutProbability).toBeCloseTo(.4);expect(c.positivePayoutProbability).toBeCloseTo(.5);
    expect(b.profitablePlayProbability).toBeCloseTo(.1);
  });
  it('replays exact sessions, conserves treasury and keeps all eligible denominators',()=>{
    const p=defaultSpecialist('payout');if(p.kind!=='payout')throw Error();
    const c={...p.baseline,playerWalletMinor:100,netLossLimitMinor:100,outcomes:[{id:'loss',name:'Loss',weight:1,payoutMinor:0}]};
    const r=payoutSimulation(c,{seed:42,trials:10,rounds:100});
    expect(r).toEqual(payoutSimulation(c,{seed:42,trials:10,rounds:100}));expect(r.plays).toBe(10);expect(r.meanContributionMinor).toBe(97);
    expect(r.playerNetMeanMinor).toBe(-100);expect(r.depletedProbability).toBe(1);expect(r.lossStoppedProbability).toBe(1);expect(r.reconciliationError).toBe(0);
    expect(r.horizons.map(h=>h.anyPositivePayout)).toEqual([0,0,0]);
  });
  it('detects intra-session treasury deficit and never compensates payout odds',()=>{
    const p=defaultSpecialist('payout');if(p.kind!=='payout')throw Error();const c={...p.baseline,treasuryMinor:0,outcomes:[{id:'win',name:'Win',weight:1,payoutMinor:600}]};
    const r=payoutSimulation(c,{seed:42,trials:10,rounds:2});expect(r.treasuryDeficitProbability).toBe(1);expect(r.maxDeficitMinor).toBe(1006);expect(r.math.rtp).toBe(6);expect(r.reconciliationError).toBe(0);
  });
  it('shares treasury across independent players while preserving per-player denominators',()=>{
    const p=defaultSpecialist('payout');if(p.kind!=='payout')throw Error();const r=payoutSimulation({...p.baseline,playerWalletMinor:100,netLossLimitMinor:100,outcomes:[{id:'loss',name:'Loss',weight:1,payoutMinor:0}]},{seed:42,trials:10,rounds:100,sessionsPerTrial:3});
    expect(r.eligibleSessions).toBe(30);expect(r.plays).toBe(30);expect(r.meanPlays).toBe(1);expect(r.meanContributionMinor).toBe(291);expect(r.meanContributionPerPlayerMinor).toBe(97);expect(r.reconciliationError).toBe(0);expect(r.depletedProbability).toBe(1);
  });
  it('reports zero-action payout metrics without NaN or fabricated RTP',()=>{
    const p=defaultSpecialist('payout');if(p.kind!=='payout')throw Error();const r=payoutSimulation({...p.baseline,netLossLimitMinor:0},p.run);
    expect(r.actualRtp).toBeNull();expect(r.plays).toBe(0);expect(r.meanContributionMinor).toBe(0);expect(r.horizons.every(r=>r.anyPositivePayout===0)).toBe(true);
    expect(r.meanIntervalMinor).toBeNull();expect(r.treasuryDeficitInterval.high).toBeGreaterThan(0);expect(r.treasuryDeficitInterval.low).toBeCloseTo(0);
  });
  it('keeps lifetime cap, redemption conservation and shared resale capacity',()=>{
    const p=defaultSpecialist('collectible');if(p.kind!=='collectible')throw Error();const c={...p.baseline,listingRate:1,fillRate:1,resaleCapacity:7,redemptionRate:.5,items:[{...p.baseline.items[0]!,cap:12,openingIssued:10,openingRedeemed:4,requestedIssue:10},{...p.baseline.items[1]!,cap:10,openingIssued:10,openingRedeemed:0,requestedIssue:5}]};
    const r=collectibleReport(c);expect(r.issued).toBe(2);expect(r.denied).toBe(13);expect(r.resales).toBe(7);expect(r.ledger.map(r=>r.resales)).toEqual([3,4]);expect(r.outstanding).toBe(9);expect(r.conservationErrors).toBe(0);
    expect(r.ledger.every(r=>r.openingIssued+r.issued<=r.cap)).toBe(true);expect(r.ledger[0]!.redeemed).toBe(4);
  });
  it('separates secondary seller proceeds from operator cash and guaranteed liabilities',()=>{
    const p=defaultSpecialist('collectible');if(p.kind!=='collectible')throw Error();const row={...p.baseline.items[0]!,cap:100,openingIssued:0,openingRedeemed:0,requestedIssue:10,issuePriceMinor:100,issueCostMinor:10,marketValueMinor:200,redemptionMinor:50};
    const r=collectibleReport({...p.baseline,items:[row],primaryFeeRate:.1,resaleFeeRate:.05,listingRate:1,fillRate:1,resaleCapacity:100,redemptionRate:.2,fixedCostMinor:0,reserveMinor:0,market:{low:0,base:1,high:2}});
    expect(r.liabilityMinor).toBe(400);expect(r.redemptionPaidMinor).toBe(100);expect(r.scenarios[1]).toMatchObject({secondaryVolumeMinor:2000,resaleFeesMinor:100,sellerNetMinor:1900,operatorCashMinor:800,cashAfterLiabilityMinor:400});
    expect(r.scenarios[0]!.operatorCashMinor).toBe(700);expect(r.scenarios[2]!.operatorCashMinor).toBe(900);
  });
  it('rejects unsupported fields, overissued stock, invalid money, units and excessive work',()=>{
    const p=defaultSpecialist('collectible');expect(()=>assertSpecialist({...p,extra:true})).toThrow('Unsupported field');
    if(p.kind!=='collectible')throw Error();p.candidate.items[0]!.openingIssued=20000;expect(()=>assertSpecialist(p)).toThrow('lifetime cap');
    const payout=defaultSpecialist('payout');payout.run={seed:1,trials:5000,rounds:1000};expect(()=>assertSpecialist(payout)).toThrow('1,000,000');payout.run.rounds=1;
    payout.candidate.currency='JPY';expect(()=>assertSpecialist(payout)).toThrow('USD');
    if(payout.kind!=='payout')throw Error();payout.candidate.currency='USD';payout.candidate.outcomes[0]!.weight=0;expect(()=>assertSpecialist(payout)).toThrow('whole number');
  });
  it('binds review scope to exact configurations and never authorizes operational release',async()=>{
    const p=defaultSpecialist('payout');p.review.owner='Synthetic owner';p.review.jurisdiction='Synthetic UK reference';const hash=await reviewScopeHash(p);
    p.review.records=p.review.records.map(r=>({...r,status:'reviewed',reviewer:'Synthetic reviewer',reference:'Synthetic review record',scopeHash:hash}));
    const r=await specialistExport(p);expect(r.reviewComplete).toBe(true);expect(r.releaseStatus).toBe('research-only');expect(r.scopeHash).toBe(hash);
    if(p.kind!=='payout')throw Error();p.candidate.stakeMinor++;expect((await specialistExport(p)).reviews.every(r=>!r.current)).toBe(true);
  });
  it('imports v6 profiles and refuses silent downgrade or dropped fields',async()=>{
    const project=await importProject(JSON.parse(await readFile('projects/digital-packs/collectible-card-pack.json','utf8')));
    const p={...project,version:6,specialist:defaultSpecialist('collectible')};expect((await importProject(p)).specialist).toEqual(p.specialist);
    await expect(importProject({...p,version:5})).rejects.toThrow('version 6');
  });
});
