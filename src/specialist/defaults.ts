import type { CollectibleConfig, PayoutConfig, SpecialistProfile } from './types.ts';
export function defaultSpecialist(kind:SpecialistProfile['kind']):SpecialistProfile {
  const common={format:'specialist-profile' as const,version:1 as const,provenance:'synthetic' as const,run:{seed:42,trials:1000,rounds:100},review:{jurisdiction:'Unspecified',owner:'',changeId:'synthetic-study-001',classification:'major' as const,rationale:'Synthetic configuration comparison; external review pending.',records:(['operations','legal','test-house'] as const).map(role=>({role,reviewer:'',status:'pending' as const,reference:'',scopeHash:''}))}};
  if(kind==='collectible') {
    const baseline:CollectibleConfig={currency:'USD',primaryFeeRate:.03,resaleFeeRate:.05,listingRate:.3,fillRate:.5,resaleCapacity:1000,redemptionRate:.02,fixedCostMinor:10000,reserveMinor:30000,market:{low:.5,base:1,high:1.5},items:[{id:'common',name:'Common edition',cap:10000,openingIssued:1000,openingRedeemed:0,requestedIssue:1000,issuePriceMinor:200,issueCostMinor:10,marketValueMinor:150,redemptionMinor:20},{id:'rare',name:'Rare edition',cap:500,openingIssued:100,openingRedeemed:0,requestedIssue:200,issuePriceMinor:1000,issueCostMinor:20,marketValueMinor:1200,redemptionMinor:100}]};
    return {...common,kind,baseline,candidate:{...structuredClone(baseline),resaleFeeRate:.03,fillRate:.6}};
  }
  const baseline:PayoutConfig={currency:'USD',stakeMinor:100,feeRate:.02,operatingCostMinor:1,treasuryMinor:10000,playerWalletMinor:5000,netLossLimitMinor:2000,outcomes:[{id:'loss',name:'No payout',weight:60,payoutMinor:0},{id:'small',name:'Stake returned',weight:30,payoutMinor:100},{id:'large',name:'Six times stake',weight:10,payoutMinor:600}]};
  return {...common,kind,baseline,candidate:{...structuredClone(baseline),outcomes:[{id:'loss',name:'No payout',weight:50,payoutMinor:0},{id:'small',name:'Stake returned',weight:40,payoutMinor:100},{id:'large',name:'Five times stake',weight:10,payoutMinor:500}]}};
}
