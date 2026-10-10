import type { Banner, InitialState } from '../engine/types.ts';

export const RESOURCE_SCALE = 1000;
export const ORIGINS = ['promotional', 'earned', 'paid'] as const;
export type Origin = typeof ORIGINS[number];
/** Resource balances are integer thousandths; cash is integer hundredths. */
export type Wallet = Record<Origin, number>;
export interface Offer {
  id: string; name: string; kind: 'bundle' | 'exact' | 'subscription';
  priceMinor: number; paid: number; promotional: number;
  startDay: number; endDay: number; limit: number;
  subscriptionDays: number; dailyPromotional: number;
}
export interface PlayerPolicy {
  id: string; name: string; kind: 'free' | 'budget' | 'goal' | 'saver'; weight: number;
  attendance: number; purchaseChance: number; actionsPerSession: number;
  sessionMinutes: number; minutesPerAction: number; dailyBudgetMinor: number;
  totalBudgetMinor: number; savingUntilDay: number; stopOnGoal: boolean;
  offerId: string; wallet: Wallet; initialState: InitialState;
}
export type CalendarEvent = { id: string; day: number } & (
  { type: 'grant'; origin: Origin; amount: number } |
  { type: 'expire-promotional' } |
  { type: 'season'; seasonId: string } |
  { type: 'banner-switch'; model: Banner } |
  { type: 'target-switch'; targetId: string }
);
export interface Finance {
  feeBps: number; fixedFeeMinor: number; inclusiveTaxBps: number;
  refundBps: number; refundDelayDays: number; fulfilmentPerCopyMinor: number;
  activeDayCostMinor: number; promotionalUnitCostMinor: number;
  otherProductPerActiveDayMinor: number; convention: string;
}
export interface Response {
  attendanceMultiplier: number; purchaseMultiplier: number; costMultiplier: number;
  cannibalizationBps: number;
}
export interface UtilityRule { itemId: string; tag: string; copyValues: number[] }
export interface EconomyConfig {
  version: 1; evidence: 'synthetic'; name: string; cashCurrency: string;
  startDate: string; timeZone: string; days: number; trials: number;
  availableFromDay: number; availableThroughDay: number;
  dailyEarned: number; dailyPromotional: number; finance: Finance;
  offers: Offer[]; policies: PlayerPolicy[]; calendar: CalendarEvent[];
  utility: { version: 1; name: string; rules: UtilityRule[]; rosterBonus: number };
  response: Response; adverse: Response;
}
export const CASH_FIELDS = ['payments','refunds','tax','fees','fulfilment','service','promotion','otherProduct','cannibalization'] as const;
export type CashField = typeof CASH_FIELDS[number];
export type Cash = Record<CashField, number>;
export interface LedgerEvent {
  id: string; day: number; kind: string; wallet?: Partial<Wallet>;
  inventory?: Record<string, number>; shards?: number; cash?: Partial<Cash>;
}
export interface LedgerView { wallet: Wallet; inventory: Record<string, number>; shards: number; cash: Cash }
export interface DayResult {
  day: number; date: string; active: boolean; activeDays: number; purchases: number;
  pulls: number; complete: boolean; utility: number; rosterCoverage: number;
  wallet: Wallet; cash: Cash; contributionMinor: number; pendingRefundMinor: number;
}
export interface PlayerResult {
  days: DayResult[]; firstGoalDay: number | null; firstUsefulDay: number | null;
  opening: LedgerView; movements: LedgerView; closing: LedgerView; events: LedgerEvent[];
  eventCount: number; truncated: boolean; reconciled: boolean;
  protection: InitialState; scopedProgress: unknown;
}
