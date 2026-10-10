import { assertCollectible, type CollectibleConfig } from './types.ts';
export function collectibleReport(config: CollectibleConfig) {
  assertCollectible(config);
  const rows = config.items.map(item => {
    const issued = Math.min(item.requestedIssue, item.cap - item.openingIssued);
    const available = item.openingIssued - item.openingRedeemed + issued;
    return { ...item, issued, denied: item.requestedIssue - issued, available, requestedResales: Math.floor(available * config.listingRate * config.fillRate), redeemed: Math.floor(available * config.redemptionRate) };
  });
  const demand = rows.reduce((sum, r) => sum + r.requestedResales, 0), capacity = Math.min(demand, config.resaleCapacity);
  const shares = rows.map((r, i) => ({ i, exact: demand ? r.requestedResales * capacity / demand : 0 }));
  const allocated = shares.map(r => Math.floor(r.exact));
  const remaining = capacity - allocated.reduce((a,b) => a+b, 0);
  shares.slice().sort((a,b) => (b.exact % 1) - (a.exact % 1) || a.i-b.i).slice(0, remaining).forEach(r => allocated[r.i]++);
  const ledger = rows.map((r, i) => ({ ...r, resales: allocated[i]!, outstanding: r.available - r.redeemed,
    primaryGrossMinor: r.issued * r.issuePriceMinor, issueCostTotalMinor: r.issued * r.issueCostMinor,
    redemptionPaidMinor: r.redeemed * r.redemptionMinor, liabilityMinor: (r.available-r.redeemed) * r.redemptionMinor,
    conservationError: (r.openingIssued-r.openingRedeemed) + r.issued - r.redeemed - (r.available-r.redeemed) }));
  const sum = (key: keyof typeof ledger[number]) => ledger.reduce((a,r) => a+Number(r[key]),0);
  const primaryGrossMinor = sum('primaryGrossMinor'), primaryFeesMinor = Math.round(primaryGrossMinor * config.primaryFeeRate);
  const redemptionPaidMinor = sum('redemptionPaidMinor'), liabilityMinor = sum('liabilityMinor');
  const scenarios = (['low','base','high'] as const).map(name => {
    const secondaryVolumeMinor = Math.round(ledger.reduce((sum,r) => sum+r.resales*r.marketValueMinor*config.market[name],0));
    const resaleFeesMinor = Math.round(secondaryVolumeMinor * config.resaleFeeRate);
    const operatorCashMinor = primaryGrossMinor - primaryFeesMinor - sum('issueCostTotalMinor') + resaleFeesMinor - redemptionPaidMinor - config.fixedCostMinor;
    return { name, multiplier: config.market[name], secondaryVolumeMinor, resaleFeesMinor, sellerNetMinor: secondaryVolumeMinor-resaleFeesMinor, operatorCashMinor,
      cashAfterLiabilityMinor: operatorCashMinor-liabilityMinor, reserveGapMinor: Math.max(0, liabilityMinor-(config.reserveMinor+operatorCashMinor)) };
  });
  return { ledger, primaryGrossMinor, primaryFeesMinor, redemptionPaidMinor, liabilityMinor, issued: sum('issued'), denied: sum('denied'), resales: capacity, unfilledResales: demand-capacity,
    outstanding: sum('outstanding'), conservationErrors: ledger.filter(r => r.conservationError !== 0).length, scenarios };
}
